import { describe, expect, it } from 'vitest';
import { buildAssessmentForm, completeScores, scoreAssessment, seededRandom } from './assessment';
import { GRAMMAR_ITEMS, PSEUDOWORDS } from '../content/assessment';
import { NGSL } from '../content/vocab.generated';

describe('formularios', () => {
  it('diagnóstico: 25 ítems de gramática, 50 palabras reales + 12 pseudopalabras', () => {
    const f = buildAssessmentForm({ kind: 'diagnostic', previousCount: 0, seenGrammar: new Map(), rand: seededRandom(1) });
    expect(f.form).toBe(1);
    expect(f.grammar).toHaveLength(25);
    expect(f.vocab.filter((v) => v.band !== null)).toHaveLength(50);
    expect(f.vocab.filter((v) => v.band === null)).toHaveLength(12);
    expect(f.reading.map((p) => p.level)).toEqual(['A2', 'B1', 'B2']);
    expect(new Set(f.vocab.map((v) => v.word)).size).toBe(f.vocab.length);
  });

  it('semanal: alterna formularios y prefiere ítems de gramática no vistos', () => {
    const seen = new Map(GRAMMAR_ITEMS.filter((g) => g.diagnostic).map((g) => [g.id, 1]));
    const f = buildAssessmentForm({ kind: 'weekly', previousCount: 1, seenGrammar: seen, rand: seededRandom(2) });
    expect(f.form).toBe(2);
    expect(f.grammar).toHaveLength(15);
    const unseen = f.grammar.filter((g) => !seen.has(g.id)).length;
    // A1 tiene 3 no-diagnósticos, A2 3, B1 4, B2 4, C1 3 => 15 sin repetir.
    expect(unseen).toBe(15);
    expect(f.reading.every((p) => p.level !== 'A2')).toBe(true);
    const f2 = buildAssessmentForm({ kind: 'weekly', previousCount: 2, seenGrammar: seen, rand: seededRandom(2) });
    expect(f2.form).toBe(1);
  });

  it('la semilla hace el formulario reproducible', () => {
    const a = buildAssessmentForm({ kind: 'diagnostic', previousCount: 0, seenGrammar: new Map(), rand: seededRandom(7) });
    const b = buildAssessmentForm({ kind: 'diagnostic', previousCount: 0, seenGrammar: new Map(), rand: seededRandom(7) });
    expect(a.vocab).toEqual(b.vocab);
  });
});

describe('contenido', () => {
  it('cada ítem de gramática tiene una respuesta válida y opciones únicas', () => {
    for (const g of GRAMMAR_ITEMS) {
      expect(g.answer).toBeGreaterThanOrEqual(0);
      expect(g.answer).toBeLessThan(g.options.length);
      expect(new Set(g.options).size).toBe(g.options.length);
    }
  });
  it('ninguna pseudopalabra está en la NGSL', () => {
    const ngsl = new Set(NGSL.map(([l]) => l));
    for (const p of PSEUDOWORDS) expect(ngsl.has(p)).toBe(false);
  });
  it('NGSL completa: 2809 lemas, rangos consecutivos, 1000 con traducción', () => {
    expect(NGSL).toHaveLength(2809);
    NGSL.forEach(([, rank], i) => {
      expect(rank).toBe(i + 1);
    });
    expect(NGSL.filter((r) => r[2] !== undefined)).toHaveLength(1000);
  });
});

describe('puntaje del test', () => {
  it('calcula habilidades y deja en null las omitidas', () => {
    const r = scoreAssessment({
      vocab: [
        ...Array.from({ length: 10 }, () => ({ band: 'k1a', saidYes: true })),
        ...Array.from({ length: 10 }, () => ({ band: 'k1b', saidYes: true })),
        ...Array.from({ length: 10 }, () => ({ band: 'k2', saidYes: false })),
        ...Array.from({ length: 5 }, () => ({ band: null, saidYes: false })),
      ],
      grammar: [{ level: 'A1', credit: 1 }, { level: 'A2', credit: 1 }, { level: 'B1', credit: 0 }],
      reading: null,
      listening: [{ level: 'A2', credit: 1 }],
      readAloud: null,
      speakingRubric: [2, 2, 2, 2],
      writingRubric: null,
    });
    expect(r.vocabSize).toBe(1000);
    expect(r.scores.vocab).toBeCloseTo(26.7, 1);
    expect(r.scores.grammar).toBe(40);
    expect(r.scores.reading).toBeNull();
    expect(r.scores.speaking).toBe(50);
    expect(r.levels.grammar).toBe('A2');
    expect(completeScores(r.scores, null).reading).toBe(30);
  });
});
