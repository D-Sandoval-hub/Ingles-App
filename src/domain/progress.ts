import { addDays } from './time';
import { MINIMUM_DAY_MINUTES } from './plan';
import type { BlockKind, Module, Skill, SkillScores } from './types';

export interface SessionRecord {
  dayKey: string;
  module: Module;
  kind: BlockKind;
  seconds: number;
  /** 0–100 si la sesión tuvo ejercicios calificables. */
  score: number | null;
}

export interface DailyTotals {
  dayKey: string;
  activeMinutes: number;
  inputMinutes: number;
  /** Promedio de puntajes del día (null si no hubo ejercicios calificables). */
  performance: number | null;
}

export function dailyTotals(sessions: readonly SessionRecord[]): Map<string, DailyTotals> {
  const map = new Map<string, DailyTotals & { scoreSum: number; scoreN: number }>();
  for (const s of sessions) {
    const t = map.get(s.dayKey) ?? { dayKey: s.dayKey, activeMinutes: 0, inputMinutes: 0, performance: null, scoreSum: 0, scoreN: 0 };
    if (s.kind === 'input') t.inputMinutes += s.seconds / 60;
    else t.activeMinutes += s.seconds / 60;
    if (s.score !== null) {
      t.scoreSum += s.score;
      t.scoreN += 1;
    }
    map.set(s.dayKey, t);
  }
  const out = new Map<string, DailyTotals>();
  for (const [k, t] of map) {
    out.set(k, {
      dayKey: k,
      activeMinutes: Math.round(t.activeMinutes),
      inputMinutes: Math.round(t.inputMinutes),
      performance: t.scoreN > 0 ? Math.round((t.scoreSum / t.scoreN) * 10) / 10 : null,
    });
  }
  return out;
}

function totalMinutes(t: DailyTotals | undefined): number {
  return t ? t.activeMinutes + t.inputMinutes : 0;
}

/**
 * Racha: días consecutivos con al menos el día mínimo (120 min entre activo e input).
 * Hoy cuenta si ya se cumplió; si no, la racha se mide hasta ayer (todavía puedes salvarla).
 */
export function streak(totals: ReadonlyMap<string, DailyTotals>, today: string): number {
  let day = totalMinutes(totals.get(today)) >= MINIMUM_DAY_MINUTES ? today : addDays(today, -1);
  let n = 0;
  while (totalMinutes(totals.get(day)) >= MINIMUM_DAY_MINUTES) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export type AlertKind = 'under_minimum' | 'overload';

export interface StudyAlert {
  kind: AlertKind;
  message: string;
}

/**
 * Alertas:
 * - Bajo el mínimo: 2+ días seguidos (sin contar hoy) bajo 120 min, dentro del período desde `startKey`.
 * - Sobrecarga: en los últimos 3 días las horas suben ≥ 10 % respecto a los 4 anteriores
 *   y el rendimiento cae ≥ 8 puntos. Señal de fatiga: más horas, peor resultado.
 */
export function computeAlerts(totals: ReadonlyMap<string, DailyTotals>, today: string, startKey: string): StudyAlert[] {
  const alerts: StudyAlert[] = [];

  let under = 0;
  for (let i = 1; i <= 7; i++) {
    const day = addDays(today, -i);
    if (day < startKey) break;
    if (totalMinutes(totals.get(day)) < MINIMUM_DAY_MINUTES) under++;
    else break;
  }
  if (under >= 2) {
    alerts.push({
      kind: 'under_minimum',
      message: `Llevas ${under} días seguidos bajo el mínimo de 2 horas. Hoy apunta al "día mínimo": es mejor poco y constante que retomar con todo y abandonar.`,
    });
  }

  const recent = [1, 2, 3].map((i) => totals.get(addDays(today, -i)));
  const before = [4, 5, 6, 7].map((i) => totals.get(addDays(today, -i)));
  const recentDays = recent.filter((t): t is DailyTotals => t !== undefined);
  const beforeDays = before.filter((t): t is DailyTotals => t !== undefined);
  if (recentDays.length >= 2 && beforeDays.length >= 2) {
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const hoursRecent = avg(recentDays.map(totalMinutes));
    const hoursBefore = avg(beforeDays.map(totalMinutes));
    const perfRecent = recentDays.map((t) => t.performance).filter((p): p is number => p !== null);
    const perfBefore = beforeDays.map((t) => t.performance).filter((p): p is number => p !== null);
    if (
      perfRecent.length > 0 &&
      perfBefore.length > 0 &&
      hoursBefore > 0 &&
      hoursRecent >= hoursBefore * 1.1 &&
      avg(perfBefore) - avg(perfRecent) >= 8
    ) {
      alerts.push({
        kind: 'overload',
        message:
          'Señal de sobrecarga: estudias más horas pero tu rendimiento está bajando. Considera un día mínimo o liviano, dormir bien y retomar mañana.',
      });
    }
  }
  return alerts;
}

/** Módulo → habilidad a la que aporta evidencia de rendimiento. */
const MODULE_SKILL: Partial<Record<Module, Skill>> = {
  srs: 'vocab',
  listening: 'listening',
  pronunciation: 'speaking',
  conversation: 'speaking',
  grammar_writing: 'grammar',
};

/** Precisión esperada en ejercicios ajustados a tu nivel. Bajo esto, la habilidad "va atrasada". */
export const TARGET_ACCURACY = 75;

/**
 * Puntajes para adaptar el plan: parte de la última evaluación y la ajusta según
 * la precisión en ejercicios de los últimos 7 días (hasta ±10 puntos).
 * La precisión en ejercicios no es un nivel MCER, por eso no se promedia directamente:
 * se usa como señal relativa (sobre o bajo el 75 % esperado).
 * Sin evaluación previa, parte de 30 (≈ A1).
 */
export function currentSkillScores(params: {
  lastAssessment: SkillScores | null;
  sessions: readonly SessionRecord[];
  today: string;
}): SkillScores {
  const base: SkillScores = params.lastAssessment ?? {
    vocab: 30,
    grammar: 30,
    reading: 30,
    listening: 30,
    speaking: 30,
    writing: 30,
  };
  const from = addDays(params.today, -7);
  const sums = new Map<Skill, { sum: number; n: number }>();
  for (const s of params.sessions) {
    if (s.score === null || s.dayKey < from) continue;
    const skill = MODULE_SKILL[s.module];
    if (!skill) continue;
    const acc = sums.get(skill) ?? { sum: 0, n: 0 };
    acc.sum += s.score;
    acc.n += 1;
    sums.set(skill, acc);
  }
  const out = { ...base };
  for (const [skill, { sum, n }] of sums) {
    const delta = Math.max(-10, Math.min(10, 0.4 * (sum / n - TARGET_ACCURACY)));
    out[skill] = Math.round(Math.max(0, Math.min(100, base[skill] + delta)) * 10) / 10;
  }
  return out;
}
