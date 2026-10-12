import { describe, expect, it } from 'vitest';
import { pickPractice } from './practice';
import type { SkillScores } from './types';

const S: SkillScores = { vocab: 50, grammar: 40, reading: 50, listening: 60, speaking: 50, writing: 50 };
const sum = (xs: { minutes: number }[]) => xs.reduce((s, x) => s + x.minutes, 0);

describe('práctica libre', () => {
  it('prioriza tarjetas vencidas y usa todo el tiempo', () => {
    const p = pickPractice({ minutes: 10, dueCount: 100, scores: S });
    expect(p[0]).toEqual({ activity: 'srs', minutes: 6 });
    expect(sum(p)).toBe(10);
  });
  it('sin vencidas va a la habilidad más débil', () => {
    const p = pickPractice({ minutes: 5, dueCount: 0, scores: S });
    expect(p).toEqual([{ activity: 'grammar', minutes: 5 }]);
    const p2 = pickPractice({ minutes: 5, dueCount: 0, scores: { ...S, listening: 10 } });
    expect(p2[0]?.activity).toBe('dictation');
  });
  it('con 15 min reparte en dos actividades', () => {
    const p = pickPractice({ minutes: 15, dueCount: 3, scores: S });
    expect(p.map((x) => x.activity)).toEqual(['srs', 'grammar', 'dictation']);
    expect(sum(p)).toBe(15);
  });
});
