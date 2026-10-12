import type { BlockKind, Module, SkillScores } from './types';

export type DayType = 'full' | 'light' | 'minimum';

export interface PlannedBlock {
  id: string;
  module: Module;
  kind: BlockKind;
  minutes: number;
  /** En cuántas sesiones conviene repartir el bloque (repetición espaciada: 2–3). */
  sessions: number;
}

export interface PlanDay {
  dayNumber: number;
  type: DayType;
  assessmentDue: boolean;
  blocks: PlannedBlock[];
}

/** Días con re-evaluación durante el programa de 30 días; después, cada 14 días. */
export const ASSESSMENT_DAYS = [7, 14, 21, 30] as const;

export const MINIMUM_DAY_MINUTES = 120;
export const WORK_MINUTES = 50;
export const BREAK_MINUTES = 10;

/** Módulos cuyo tiempo se reparte según el rendimiento (la repetición espaciada queda fija: su carga la decide FSRS). */
export const ADAPTIVE_MODULES = ['listening', 'pronunciation', 'conversation', 'grammar_writing'] as const;
export type AdaptiveModule = (typeof ADAPTIVE_MODULES)[number];

export const FULL_DAY_BASE: Record<AdaptiveModule, number> = {
  listening: 60,
  pronunciation: 60,
  conversation: 45,
  grammar_writing: 45,
};
export const FULL_DAY_SRS = 45;
export const FULL_DAY_INPUT = 210;

const MAX_SHIFT = 0.2;
const MIN_BLOCK = 30;
const STEP = 5;

export function isLightDay(dayNumber: number): boolean {
  return dayNumber > 0 && dayNumber % 7 === 0;
}

export function isScheduledAssessmentDay(dayNumber: number): boolean {
  if (dayNumber <= 30) return (ASSESSMENT_DAYS as readonly number[]).includes(dayNumber);
  return (dayNumber - 30) % 14 === 0;
}

/** Último día de re-evaluación programado que ya llegó (o null si aún no llega ninguno). */
export function lastScheduledAssessmentDay(dayNumber: number): number | null {
  for (let d = dayNumber; d >= 1; d--) {
    if (isScheduledAssessmentDay(d)) return d;
  }
  return null;
}

/**
 * ¿Hay una re-evaluación pendiente? Lo está si ya pasó un día programado y no se hizo
 * ninguna re-evaluación desde ese día. Así, perder el día 7 no la salta: queda pendiente.
 */
export function isAssessmentDue(dayNumber: number, assessmentDayNumbers: readonly number[]): boolean {
  const last = lastScheduledAssessmentDay(dayNumber);
  if (last === null) return false;
  return !assessmentDayNumbers.some((d) => d >= last);
}

/** Puntaje de habilidad que corresponde a cada módulo adaptable. */
export function moduleScore(module: AdaptiveModule, s: SkillScores): number {
  switch (module) {
    case 'listening':
      return s.listening;
    case 'pronunciation':
    case 'conversation':
      return s.speaking;
    case 'grammar_writing':
      return (s.grammar + s.writing) / 2;
  }
}

/**
 * Reparte los minutos de los módulos adaptables: más tiempo a lo que va más atrasado.
 * - Conserva el total.
 * - Cada módulo queda entre −20 % y +20 % de su base, nunca bajo 30 min.
 * - Redondea a múltiplos de 5 min.
 */
export function allocateAdaptiveMinutes(
  scores: SkillScores,
  base: Record<AdaptiveModule, number> = FULL_DAY_BASE,
): Record<AdaptiveModule, number> {
  const mods = [...ADAPTIVE_MODULES];
  const total = mods.reduce((s, m) => s + base[m], 0);
  const deficit = Object.fromEntries(mods.map((m) => [m, 100 - moduleScore(m, scores)])) as Record<AdaptiveModule, number>;
  const meanDeficit = mods.reduce((s, m) => s + deficit[m], 0) / mods.length;

  const lo = (m: AdaptiveModule) => Math.max(MIN_BLOCK, Math.ceil((base[m] * (1 - MAX_SHIFT)) / STEP) * STEP);
  const hi = (m: AdaptiveModule) => Math.floor((base[m] * (1 + MAX_SHIFT)) / STEP) * STEP;

  // z ∈ [−1, 1]: 25 puntos de diferencia con el promedio ya da el máximo desplazamiento.
  const raw = Object.fromEntries(
    mods.map((m) => {
      const z = Math.max(-1, Math.min(1, (deficit[m] - meanDeficit) / 25));
      return [m, base[m] * (1 + MAX_SHIFT * z)];
    }),
  ) as Record<AdaptiveModule, number>;
  const rawSum = mods.reduce((s, m) => s + raw[m], 0);

  const out = Object.fromEntries(
    mods.map((m) => {
      const scaled = (raw[m] * total) / rawSum;
      return [m, Math.min(hi(m), Math.max(lo(m), Math.round(scaled / STEP) * STEP))];
    }),
  ) as Record<AdaptiveModule, number>;

  // Corrige el residuo por redondeo/recortes en pasos de 5 min.
  let diff = total - mods.reduce((s, m) => s + out[m], 0);
  const byNeed = [...mods].sort((a, b) => deficit[b] - deficit[a]);
  let guard = 100;
  while (diff !== 0 && guard-- > 0) {
    const order = diff > 0 ? byNeed : [...byNeed].reverse();
    const target = order.find((m) => (diff > 0 ? out[m] + STEP <= hi(m) : out[m] - STEP >= lo(m)));
    if (!target) break;
    out[target] += diff > 0 ? STEP : -STEP;
    diff += diff > 0 ? -STEP : STEP;
  }
  return out;
}

function block(dayNumber: number, module: Module, kind: BlockKind, minutes: number, sessions = 1): PlannedBlock {
  return { id: `d${dayNumber}-${module}`, module, kind, minutes, sessions };
}

/**
 * Genera el plan de un día.
 * - Día completo: ~4,25 h activas + 3,5 h de input, con reparto adaptativo.
 * - Día liviano (cada 7 días): repaso + re-evaluación si corresponde.
 * - Día mínimo (elegido por el usuario): 2 h con lo esencial para no perder la racha.
 */
export function generatePlanDay(params: {
  dayNumber: number;
  scores: SkillScores;
  assessmentDue: boolean;
  forceMinimum?: boolean;
}): PlanDay {
  const { dayNumber, scores, assessmentDue } = params;

  if (params.forceMinimum) {
    return {
      dayNumber,
      type: 'minimum',
      assessmentDue,
      blocks: [
        block(dayNumber, 'srs', 'active', 30, 2),
        block(dayNumber, 'listening', 'active', 20),
        block(dayNumber, 'pronunciation', 'active', 15),
        block(dayNumber, 'conversation', 'active', 15),
        block(dayNumber, 'input', 'input', 40),
      ],
    };
  }

  if (isLightDay(dayNumber) || (dayNumber === 30 && assessmentDue)) {
    const blocks = [block(dayNumber, 'srs', 'active', 45, 2)];
    if (assessmentDue) blocks.push(block(dayNumber, 'assessment', 'active', 40));
    blocks.push(block(dayNumber, 'review', 'active', assessmentDue ? 30 : 50));
    blocks.push(block(dayNumber, 'listening', 'active', 30));
    blocks.push(block(dayNumber, 'input', 'input', 120));
    return { dayNumber, type: 'light', assessmentDue, blocks };
  }

  const adaptive = allocateAdaptiveMinutes(scores);
  const blocks: PlannedBlock[] = [];
  if (assessmentDue) blocks.push(block(dayNumber, 'assessment', 'active', 40));
  blocks.push(block(dayNumber, 'srs', 'active', FULL_DAY_SRS, 3));
  for (const m of ADAPTIVE_MODULES) {
    // Si hay re-evaluación pendiente en día completo, sus 40 min se descuentan
    // en partes iguales de los 4 módulos adaptables (10 min c/u), sin alargar el día.
    const minutes = assessmentDue ? adaptive[m] - 10 : adaptive[m];
    blocks.push(block(dayNumber, m, 'active', minutes));
  }
  blocks.push(block(dayNumber, 'input', 'input', FULL_DAY_INPUT));
  return { dayNumber, type: 'full', assessmentDue, blocks };
}

export function plannedMinutes(day: PlanDay, kind: BlockKind): number {
  return day.blocks.filter((b) => b.kind === kind).reduce((s, b) => s + b.minutes, 0);
}

/** Minutos de reloj con descansos de 10 min cada 50 min de trabajo. */
export function wallClockMinutes(activeMinutes: number): number {
  const breaks = Math.max(0, Math.ceil(activeMinutes / WORK_MINUTES) - 1);
  return activeMinutes + breaks * BREAK_MINUTES;
}

/**
 * Etapa del currículo: cuenta días con trabajo real (≥ día mínimo), no días calendario.
 * Si fallas un día, no te saltas contenido: el plan se corre.
 */
export function curriculumWeek(completedStudyDays: number): number {
  return Math.floor(completedStudyDays / 7) + 1;
}
