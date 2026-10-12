import { describe, expect, it } from 'vitest';
import { computeAlerts, currentSkillScores, dailyTotals, streak, type SessionRecord } from './progress';
import { addDays } from './time';

const TODAY = '2026-10-20';
const START = '2026-10-01';

function s(dayKey: string, minutes: number, kind: 'active' | 'input' = 'active', score: number | null = null): SessionRecord {
  return { dayKey, module: kind === 'input' ? 'input' : 'listening', kind, seconds: minutes * 60, score };
}

describe('dailyTotals', () => {
  it('separa horas activas y de input', () => {
    const t = dailyTotals([s(TODAY, 30), s(TODAY, 45, 'input'), s(TODAY, 20, 'active', 80), s(TODAY, 10, 'active', 60)]);
    expect(t.get(TODAY)).toEqual({ dayKey: TODAY, activeMinutes: 60, inputMinutes: 45, performance: 70 });
  });
});

describe('racha', () => {
  it('cuenta días consecutivos con >= 120 min; hoy cuenta solo si se cumplió', () => {
    const sessions = [s(addDays(TODAY, -1), 120), s(addDays(TODAY, -2), 60, 'active'), s(addDays(TODAY, -2), 60, 'input'), s(addDays(TODAY, -4), 200)];
    const t = dailyTotals(sessions);
    expect(streak(t, TODAY)).toBe(2);
    const t2 = dailyTotals([...sessions, s(TODAY, 130)]);
    expect(streak(t2, TODAY)).toBe(3);
  });
});

describe('alertas', () => {
  it('avisa con 2+ días seguidos bajo el mínimo', () => {
    const t = dailyTotals([s(addDays(TODAY, -1), 30), s(addDays(TODAY, -2), 50), s(addDays(TODAY, -3), 300)]);
    const alerts = computeAlerts(t, TODAY, START);
    expect(alerts.map((a) => a.kind)).toContain('under_minimum');
  });

  it('no avisa antes de que empiece el programa', () => {
    const alerts = computeAlerts(new Map(), '2026-10-01', '2026-10-01');
    expect(alerts).toEqual([]);
  });

  it('detecta sobrecarga: más horas y peor rendimiento', () => {
    const sessions: SessionRecord[] = [];
    for (let i = 4; i <= 7; i++) sessions.push(s(addDays(TODAY, -i), 300, 'active', 85));
    for (let i = 1; i <= 3; i++) sessions.push(s(addDays(TODAY, -i), 420, 'active', 70));
    const alerts = computeAlerts(dailyTotals(sessions), TODAY, START);
    expect(alerts.map((a) => a.kind)).toContain('overload');
  });

  it('no marca sobrecarga si el rendimiento se mantiene', () => {
    const sessions: SessionRecord[] = [];
    for (let i = 4; i <= 7; i++) sessions.push(s(addDays(TODAY, -i), 300, 'active', 80));
    for (let i = 1; i <= 3; i++) sessions.push(s(addDays(TODAY, -i), 420, 'active', 79));
    expect(computeAlerts(dailyTotals(sessions), TODAY, START).map((a) => a.kind)).not.toContain('overload');
  });
});

describe('currentSkillScores', () => {
  const assessment = { vocab: 40, grammar: 40, reading: 40, listening: 40, speaking: 40, writing: 40 };
  it('sin datos recientes = última evaluación', () => {
    expect(currentSkillScores({ lastAssessment: assessment, sessions: [], today: TODAY })).toEqual(assessment);
  });
  it('ejercicios bajo 75 % bajan el puntaje (máx. 10), sobre 75 % lo suben', () => {
    const r = currentSkillScores({
      lastAssessment: assessment,
      sessions: [s(TODAY, 20, 'active', 50), { dayKey: TODAY, module: 'grammar_writing', kind: 'active', seconds: 600, score: 100 }],
      today: TODAY,
    });
    expect(r.listening).toBe(30);
    expect(r.grammar).toBe(50);
    expect(r.vocab).toBe(40);
  });
  it('ignora sesiones de hace más de 7 días', () => {
    const r = currentSkillScores({ lastAssessment: assessment, sessions: [s(addDays(TODAY, -10), 20, 'active', 0)], today: TODAY });
    expect(r.listening).toBe(40);
  });
});
