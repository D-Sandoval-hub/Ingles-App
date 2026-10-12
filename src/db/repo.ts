import { NGSL } from '../content/vocab.generated';
import { dayKey } from '../domain/time';
import {
  DEFAULT_SRS_SETTINGS,
  newStoredCard,
  reviewCard,
  State,
  type Grade,
  type StoredCard,
} from '../domain/srs';
import type { AppDB, ErrorEvent, Settings, StoredAssessment, StudySession } from './db';

export function uid(): string {
  return crypto.randomUUID();
}

export const DEFAULT_SETTINGS: Omit<Settings, 'createdAt'> = {
  id: 'main',
  startDate: null,
  srs: DEFAULT_SRS_SETTINGS,
  ttsRate: 0.9,
  accent: 'en-US',
};

export async function getSettings(db: AppDB): Promise<Settings> {
  const s = await db.settings.get('main');
  if (s) return s;
  const fresh: Settings = { ...DEFAULT_SETTINGS, createdAt: Date.now() };
  await db.settings.put(fresh);
  return fresh;
}

export async function updateSettings(db: AppDB, patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings(db);
  const next = { ...current, ...patch };
  await db.settings.put(next);
  return next;
}

/** Lemas con traducción disponibles como tarjetas. */
export function glossedLemmas() {
  return NGSL.filter((r) => r[2] !== undefined);
}

/**
 * Crea las tarjetas que falten (idempotente). Las de rango menor a `knownBelowRank`
 * quedan marcadas como conocidas (según el test) y se pueden desmarcar en el explorador.
 */
export async function ensureDeck(db: AppDB, now: number, knownBelowRank = 1): Promise<number> {
  const existing = new Set((await db.cards.toCollection().primaryKeys()).map(String));
  const toAdd: StoredCard[] = [];
  for (const [lemma, rank] of glossedLemmas()) {
    const id = `w:${lemma}`;
    if (existing.has(id)) continue;
    const card = newStoredCard({ id, ref: lemma, kind: 'word', rank, now });
    toAdd.push(rank < knownBelowRank ? { ...card, known: 1 } : card);
  }
  if (toAdd.length > 0) await db.cards.bulkAdd(toAdd);
  return toAdd.length;
}

export async function setKnown(db: AppDB, cardId: string, known: boolean): Promise<void> {
  await db.cards.update(cardId, { known: known ? 1 : 0, updatedAt: Date.now() });
}

export async function applyReview(db: AppDB, params: { card: StoredCard; rating: Grade; now: number; durationMs: number }): Promise<StoredCard> {
  const settings = await getSettings(db);
  const next = reviewCard(params.card, params.rating, params.now, settings.srs);
  await db.transaction('rw', db.cards, db.reviewLogs, async () => {
    await db.cards.put(next);
    await db.reviewLogs.add({
      id: uid(),
      cardId: params.card.id,
      rating: params.rating,
      state: params.card.state,
      review: params.now,
      durationMs: Math.max(0, Math.min(params.durationMs, 5 * 60_000)),
      dayKey: dayKey(new Date(params.now)),
    });
  });
  return next;
}

/** Tarjetas nuevas introducidas hoy (primer repaso de una tarjeta en estado Nuevo). */
export async function introducedOn(db: AppDB, key: string): Promise<number> {
  return db.reviewLogs.where('dayKey').equals(key).filter((l) => l.state === State.New).count();
}

export async function dueCount(db: AppDB, now: number): Promise<number> {
  return db.cards
    .where('due')
    .belowOrEqual(now)
    .filter((c) => c.known === 0 && c.state !== State.New)
    .count();
}

export async function addSession(db: AppDB, s: Omit<StudySession, 'id'>): Promise<StudySession> {
  const session: StudySession = { ...s, id: uid(), seconds: Math.max(0, Math.round(s.seconds)) };
  await db.sessions.add(session);
  return session;
}

export async function addErrorEvents(db: AppDB, events: Omit<ErrorEvent, 'id'>[]): Promise<void> {
  if (events.length === 0) return;
  await db.errorEvents.bulkAdd(events.map((e) => ({ ...e, id: uid(), example: e.example.slice(0, 200) })));
}

export async function lastAssessment(db: AppDB): Promise<StoredAssessment | undefined> {
  return db.assessments.orderBy('takenAt').last();
}
