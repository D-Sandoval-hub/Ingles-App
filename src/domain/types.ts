export const SKILLS = ['vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing'] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  vocab: 'Vocabulario',
  grammar: 'Gramática',
  reading: 'Lectura',
  listening: 'Comprensión auditiva',
  speaking: 'Expresión oral',
  writing: 'Escritura',
};

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];
/** Nivel estimado; "Pre-A1" cuando no alcanza A1. */
export type CefrEstimate = CefrLevel | 'Pre-A1';

export type SkillScores = Record<Skill, number>;

export const MODULES = ['srs', 'listening', 'pronunciation', 'conversation', 'grammar_writing', 'input', 'assessment', 'review'] as const;
export type Module = (typeof MODULES)[number];

export const MODULE_LABELS: Record<Module, string> = {
  srs: 'Repetición espaciada',
  listening: 'Listening intensivo y dictado',
  pronunciation: 'Pronunciación y shadowing',
  conversation: 'Conversación',
  grammar_writing: 'Gramática y escritura',
  input: 'Input (listening extensivo)',
  assessment: 'Re-evaluación',
  review: 'Repaso general',
};

export type BlockKind = 'active' | 'input';
