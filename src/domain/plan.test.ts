import { describe, expect, it } from 'vitest';
import {
  allocateAdaptiveMinutes,
  curriculumWeek,
  FULL_DAY_BASE,
  generatePlanDay,
  isAssessmentDue,
  isLightDay,
  plannedMinutes,
  wallClockMinutes,
} from './plan';
import type { SkillScores } from './types';

const EVEN: SkillScores = { vocab: 50, grammar: 50, reading: 50, listening: 50, speaking: 50, writing: 50 };

describe('reparto adaptativo', () => {
  it('con habilidades parejas mantiene la base', () => {
    expect(allocateAdaptiveMinutes(EVEN)).toEqual(FULL_DAY_BASE);
  });

  it('da más tiempo a la habilidad atrasada, conserva el total y respeta ±20 %', () => {
    const scores = { ...EVEN, listening: 20, grammar: 70, writing: 70 };
    const out = allocateAdaptiveMinutes(scores);
    const total = Object.values(out).reduce((s, x) => s + x, 0);
    const baseTotal = Object.values(FULL_DAY_BASE).reduce((s, x) => s + x, 0);
    expect(total).toBe(baseTotal);
    expect(out.listening).toBeGreaterThan(FULL_DAY_BASE.listening);
    expect(out.grammar_writing).toBeLessThan(FULL_DAY_BASE.grammar_writing);
    for (const [m, v] of Object.entries(out) as [keyof typeof FULL_DAY_BASE, number][]) {
      expect(v).toBeGreaterThanOrEqual(Math.max(30, FULL_DAY_BASE[m] * 0.8));
      expect(v).toBeLessThanOrEqual(FULL_DAY_BASE[m] * 1.2);
      expect(v % 5).toBe(0);
    }
  });

  it('casos extremos no rompen invariantes', () => {
    for (const listening of [0, 100]) {
      for (const speaking of [0, 100]) {
        const out = allocateAdaptiveMinutes({ ...EVEN, listening, speaking });
        expect(Object.values(out).reduce((s, x) => s + x, 0)).toBe(210);
      }
    }
  });
});

describe('plan del día', () => {
  it('día completo: ~4,25 h activas + 3,5 h de input', () => {
    const day = generatePlanDay({ dayNumber: 1, scores: EVEN, assessmentDue: false });
    expect(day.type).toBe('full');
    expect(plannedMinutes(day, 'active')).toBe(255);
    expect(plannedMinutes(day, 'input')).toBe(210);
    expect(day.blocks.find((b) => b.module === 'srs')?.sessions).toBe(3);
  });

  it('día mínimo: exactamente 2 h', () => {
    const day = generatePlanDay({ dayNumber: 3, scores: EVEN, assessmentDue: false, forceMinimum: true });
    expect(day.type).toBe('minimum');
    expect(plannedMinutes(day, 'active') + plannedMinutes(day, 'input')).toBe(120);
  });

  it('cada 7 días es liviano, con re-evaluación si corresponde', () => {
    expect(isLightDay(7)).toBe(true);
    expect(isLightDay(8)).toBe(false);
    const day = generatePlanDay({ dayNumber: 7, scores: EVEN, assessmentDue: true });
    expect(day.type).toBe('light');
    expect(day.blocks.some((b) => b.module === 'assessment')).toBe(true);
    expect(plannedMinutes(day, 'active')).toBeLessThan(255);
  });

  it('día 30 con evaluación pendiente es liviano con evaluación final', () => {
    const day = generatePlanDay({ dayNumber: 30, scores: EVEN, assessmentDue: true });
    expect(day.type).toBe('light');
    expect(day.blocks.some((b) => b.module === 'assessment')).toBe(true);
  });

  it('re-evaluación pendiente en día completo no alarga el día', () => {
    const normal = generatePlanDay({ dayNumber: 8, scores: EVEN, assessmentDue: false });
    const withAssessment = generatePlanDay({ dayNumber: 8, scores: EVEN, assessmentDue: true });
    expect(plannedMinutes(withAssessment, 'active')).toBe(plannedMinutes(normal, 'active'));
  });
});

describe('re-evaluaciones', () => {
  it('se programan los días 7, 14, 21 y 30 y quedan pendientes si se pierden', () => {
    expect(isAssessmentDue(6, [])).toBe(false);
    expect(isAssessmentDue(7, [])).toBe(true);
    expect(isAssessmentDue(9, [])).toBe(true); // se perdió el día 7
    expect(isAssessmentDue(9, [8])).toBe(false); // se hizo el día 8
    expect(isAssessmentDue(14, [8])).toBe(true);
    expect(isAssessmentDue(30, [7, 14, 21])).toBe(true);
    expect(isAssessmentDue(44, [30])).toBe(true); // después del día 30, cada 14 días
    expect(isAssessmentDue(43, [30])).toBe(false);
  });
});

describe('utilidades', () => {
  it('wallClockMinutes agrega 10 min de descanso cada 50 min', () => {
    expect(wallClockMinutes(50)).toBe(50);
    expect(wallClockMinutes(100)).toBe(110);
    expect(wallClockMinutes(255)).toBe(255 + 50);
  });
  it('curriculumWeek avanza con días estudiados, no con el calendario', () => {
    expect(curriculumWeek(0)).toBe(1);
    expect(curriculumWeek(6)).toBe(1);
    expect(curriculumWeek(7)).toBe(2);
  });
});
