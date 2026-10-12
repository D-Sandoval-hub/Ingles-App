import { describe, expect, it } from 'vitest';
import {
  blendScores,
  estimateVocabSize,
  rubricScore,
  scoreToCefr,
  sectionScore,
  vocabSizeToScore,
  weakestSkill,
  wordAccuracy,
} from './scoring';

describe('sectionScore', () => {
  it('perfecto en A1–B2 y 0 en C1 => 80 (B2)', () => {
    const r = (['A1', 'A2', 'B1', 'B2'] as const).map((level) => ({ level, credit: 1 }));
    const score = sectionScore([...r, { level: 'C1', credit: 0 }]);
    expect(score).toBe(80);
    expect(scoreToCefr(score)).toBe('B2');
  });

  it('A1 y A2 perfectos, B1 a la mitad => 50 (A2)', () => {
    const score = sectionScore([
      { level: 'A1', credit: 1 },
      { level: 'A2', credit: 1 },
      { level: 'B1', credit: 1 },
      { level: 'B1', credit: 0 },
      { level: 'B2', credit: 0 },
    ]);
    expect(score).toBe(50);
    expect(scoreToCefr(score)).toBe('A2');
  });

  it('niveles inferiores sin ítems se asumen dominados si el siguiente tiene >= 60 %', () => {
    // Lectura empieza en A2: A1 se asume dominado.
    expect(sectionScore([{ level: 'A2', credit: 1 }, { level: 'B1', credit: 0 }])).toBe(40);
    expect(sectionScore([{ level: 'A2', credit: 0.5 }])).toBe(20);
  });

  it('sin respuestas => 0; el crédito se recorta a [0,1]', () => {
    expect(sectionScore([])).toBe(0);
    expect(sectionScore([{ level: 'A1', credit: 3 }])).toBe(20);
  });
});

describe('scoreToCefr', () => {
  it('mapea los umbrales', () => {
    expect(scoreToCefr(10)).toBe('Pre-A1');
    expect(scoreToCefr(20)).toBe('A1');
    expect(scoreToCefr(59.9)).toBe('A2');
    expect(scoreToCefr(60)).toBe('B1');
    expect(scoreToCefr(94)).toBe('B2');
    expect(scoreToCefr(95)).toBe('C1');
  });
});

describe('vocabulario sí/no', () => {
  const bands = [
    { id: 'b1', size: 1000 },
    { id: 'b2', size: 1000 },
  ];

  it('sin falsas alarmas: tamaño = proporción × tamaño de banda', () => {
    const answers = [
      ...Array.from({ length: 10 }, () => ({ band: 'b1', saidYes: true })),
      ...Array.from({ length: 10 }, (_, i) => ({ band: 'b2', saidYes: i < 5 })),
      ...Array.from({ length: 5 }, () => ({ band: null, saidYes: false })),
    ];
    const r = estimateVocabSize(answers, bands);
    expect(r.size).toBe(1500);
    expect(r.falseAlarmRate).toBe(0);
  });

  it('decir "sí" a todo (incluidas pseudopalabras) da 0', () => {
    const answers = [
      ...Array.from({ length: 10 }, () => ({ band: 'b1', saidYes: true })),
      ...Array.from({ length: 5 }, () => ({ band: null, saidYes: true })),
    ];
    expect(estimateVocabSize(answers, bands).size).toBe(0);
  });

  it('las falsas alarmas reducen la estimación', () => {
    const base = [
      ...Array.from({ length: 10 }, (_, i) => ({ band: 'b1', saidYes: i < 8 })),
      ...Array.from({ length: 4 }, () => ({ band: null, saidYes: false })),
    ];
    const withFa = base.map((a, i) => (a.band === null && i === 10 ? { ...a, saidYes: true } : a));
    expect(estimateVocabSize(withFa, bands).size).toBeLessThan(estimateVocabSize(base, bands).size);
  });

  it('vocabSizeToScore es monótono y acotado', () => {
    expect(vocabSizeToScore(0)).toBe(0);
    expect(vocabSizeToScore(1500)).toBe(40);
    expect(vocabSizeToScore(2000)).toBe(50);
    expect(vocabSizeToScore(10000)).toBe(100);
    expect(vocabSizeToScore(3000)).toBeGreaterThan(vocabSizeToScore(2600));
  });
});

describe('rúbrica y mezcla', () => {
  it('rubricScore', () => {
    expect(rubricScore([1, 1, 1])).toBe(30);
    expect(rubricScore([3, 3, 3])).toBe(70);
    expect(rubricScore([2, 3])).toBe(60);
    expect(rubricScore([5, 5])).toBe(97);
    expect(rubricScore([])).toBe(0);
  });

  it('blendScores', () => {
    expect(blendScores(null, 50)).toBe(50);
    expect(blendScores(80, 40)).toBe(60);
  });

  it('weakestSkill', () => {
    expect(weakestSkill({ vocab: 50, grammar: 40, reading: 60, listening: 20, speaking: 30, writing: 45 })).toBe('listening');
  });
});

describe('wordAccuracy', () => {
  it('ignora mayúsculas y puntuación', () => {
    expect(wordAccuracy("I'm going to the store.", "i'm going to the store")).toBe(1);
  });
  it('cuenta palabras faltantes y erróneas', () => {
    expect(wordAccuracy('I am going to the store', 'I going to a store')).toBeCloseTo(4 / 6, 5);
    expect(wordAccuracy('hello world', '')).toBe(0);
  });
});
