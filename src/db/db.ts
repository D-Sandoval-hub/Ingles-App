import Dexie, { type EntityTable } from 'dexie';
import type { AssessmentKind } from '../domain/assessment';
import type { SrsSettings, StoredCard, StoredReviewLog } from '../domain/srs';
import type { BlockKind, CefrEstimate, Module, Skill, SkillScores } from '../domain/types';

export interface Settings {
  id: 'main';
  /** Día 1 del programa ('YYYY-MM-DD'); null hasta terminar u omitir el diagnóstico. */
  startDate: string | null;
  srs: SrsSettings;
  /** Velocidad de la voz sintética (0.5–1.5). */
  ttsRate: number;
  /** Acento principal de audio y ejemplos. */
  accent: 'en-US';
  createdAt: number;
}

export interface StudySession {
  id: string;
  dayKey: string;
  module: Module;
  kind: BlockKind;
  startedAt: number;
  endedAt: number;
  seconds: number;
  /** 0–100 si la sesión tuvo ejercicios calificables. */
  score: number | null;
  /** Para input: recurso escuchado y comprensión autoevaluada (1–5). */
  resourceId?: string;
  comprehension?: number;
}

export interface StoredAssessment {
  id: string;
  kind: AssessmentKind;
  form: 1 | 2;
  dayNumber: number;
  dayKey: string;
  takenAt: number;
  scores: Record<Skill, number | null>;
  /** Puntajes completos (secciones omitidas rellenadas con el valor anterior). */
  completed: SkillScores;
  levels: Record<Skill, CefrEstimate | null>;
  vocabSize: number | null;
  falseAlarmRate: number | null;
  grammarSeen: string[];
  speakingTranscript: string;
  writingText: string;
}

export interface ErrorEvent {
  id: string;
  tag: string;
  example: string;
  at: number;
  source: 'writing' | 'grammar' | 'assessment';
}

export interface DayChoice {
  dayKey: string;
  type: 'minimum';
}

export class AppDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  cards!: EntityTable<StoredCard, 'id'>;
  reviewLogs!: EntityTable<StoredReviewLog, 'id'>;
  sessions!: EntityTable<StudySession, 'id'>;
  assessments!: EntityTable<StoredAssessment, 'id'>;
  errorEvents!: EntityTable<ErrorEvent, 'id'>;
  dayChoices!: EntityTable<DayChoice, 'dayKey'>;

  constructor(name = 'ingles-app') {
    super(name);
    this.version(1).stores({
      settings: '&id',
      cards: '&id, due, rank, state, known, &ref',
      reviewLogs: '&id, cardId, dayKey, review',
      sessions: '&id, dayKey, module, kind',
      assessments: '&id, takenAt, dayNumber',
      errorEvents: '&id, tag, at',
      dayChoices: '&dayKey',
    });
  }
}

export const db = new AppDB();
