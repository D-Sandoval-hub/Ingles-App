import { z } from 'zod';
import { MODULES, SKILLS } from '../domain/types';
import { Rating, State, type Grade } from '../domain/srs';
import type { AppDB } from './db';

/** Respaldo completo en JSON. Los datos viven solo en este dispositivo: respalda seguido. */
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 30 * 1024 * 1024;

const num = z.number();
const skillRecord = <T extends z.ZodType>(t: T) => z.object(Object.fromEntries(SKILLS.map((s) => [s, t])) as Record<(typeof SKILLS)[number], T>);
const cefr = z.enum(['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1']).nullable();

const cardSchema = z.object({
  id: z.string().max(200),
  ref: z.string().max(200),
  kind: z.enum(['word', 'phrase']),
  rank: num,
  due: num,
  stability: num,
  difficulty: num,
  elapsed_days: num,
  scheduled_days: num,
  learning_steps: num,
  reps: num,
  lapses: num,
  state: z.enum(State),
  last_review: num.nullable(),
  known: z.union([z.literal(0), z.literal(1)]),
  updatedAt: num,
});

export const backupSchema = z.object({
  app: z.literal('ingles-app'),
  version: z.literal(BACKUP_VERSION),
  exportedAt: num,
  settings: z.array(
    z.object({
      id: z.literal('main'),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      srs: z.object({ retention: z.number().min(0.7).max(0.97), newPerDay: z.number().int().min(0).max(200) }),
      ttsRate: z.number().min(0.5).max(1.5),
      accent: z.literal('en-US'),
      createdAt: num,
    }),
  ).max(1),
  cards: z.array(cardSchema).max(100_000),
  reviewLogs: z.array(
    z.object({
      id: z.string().max(100),
      cardId: z.string().max(200),
      rating: z.enum(Rating).refine((r): r is Grade => r !== Rating.Manual, 'calificación inválida'),
      state: z.enum(State),
      review: num,
      durationMs: num,
      dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  ).max(1_000_000),
  sessions: z.array(
    z.object({
      id: z.string().max(100),
      dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      module: z.enum(MODULES),
      kind: z.enum(['active', 'input']),
      startedAt: num,
      endedAt: num,
      seconds: z.number().min(0).max(24 * 3600),
      score: z.number().min(0).max(100).nullable(),
      resourceId: z.string().max(100).optional(),
      comprehension: z.number().int().min(1).max(5).optional(),
    }),
  ).max(200_000),
  assessments: z.array(
    z.object({
      id: z.string().max(100),
      kind: z.enum(['diagnostic', 'weekly']),
      form: z.union([z.literal(1), z.literal(2)]),
      dayNumber: z.number().int(),
      dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      takenAt: num,
      scores: skillRecord(num.nullable()),
      completed: skillRecord(num),
      levels: skillRecord(cefr),
      vocabSize: num.nullable(),
      falseAlarmRate: num.nullable(),
      grammarSeen: z.array(z.string().max(20)).max(200),
      speakingTranscript: z.string().max(10_000),
      writingText: z.string().max(10_000),
    }),
  ).max(1000),
  errorEvents: z.array(
    z.object({
      id: z.string().max(100),
      tag: z.string().max(60),
      example: z.string().max(200),
      at: num,
      source: z.enum(['writing', 'grammar', 'assessment']),
    }),
  ).max(100_000),
  dayChoices: z.array(z.object({ dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), type: z.literal('minimum') })).max(10_000),
});

export type Backup = z.infer<typeof backupSchema>;

export async function exportBackup(db: AppDB): Promise<Backup> {
  return {
    app: 'ingles-app',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    settings: await db.settings.toArray(),
    cards: await db.cards.toArray(),
    reviewLogs: await db.reviewLogs.toArray(),
    sessions: await db.sessions.toArray(),
    assessments: await db.assessments.toArray(),
    errorEvents: await db.errorEvents.toArray(),
    dayChoices: await db.dayChoices.toArray(),
  };
}

export class BackupError extends Error {}

/** Valida el JSON antes de tocar la base. Si es inválido, no se modifica nada. */
export function parseBackup(text: string): Backup {
  if (text.length > MAX_BACKUP_BYTES) throw new BackupError('El archivo es demasiado grande.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es un JSON válido.');
  }
  const result = backupSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new BackupError(`El respaldo no tiene el formato esperado${first ? ` (${first.path.join('.')}: ${first.message})` : ''}.`);
  }
  return result.data;
}

/** Reemplaza todos los datos por los del respaldo, en una sola transacción. */
export async function importBackup(db: AppDB, backup: Backup): Promise<void> {
  await db.transaction('rw', [db.settings, db.cards, db.reviewLogs, db.sessions, db.assessments, db.errorEvents, db.dayChoices], async () => {
    await Promise.all([
      db.settings.clear(),
      db.cards.clear(),
      db.reviewLogs.clear(),
      db.sessions.clear(),
      db.assessments.clear(),
      db.errorEvents.clear(),
      db.dayChoices.clear(),
    ]);
    await db.settings.bulkAdd(backup.settings);
    await db.cards.bulkAdd(backup.cards);
    await db.reviewLogs.bulkAdd(backup.reviewLogs);
    await db.sessions.bulkAdd(backup.sessions);
    await db.assessments.bulkAdd(backup.assessments);
    await db.errorEvents.bulkAdd(backup.errorEvents);
    await db.dayChoices.bulkAdd(backup.dayChoices);
  });
}
