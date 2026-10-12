import {
  DICTATION_ITEMS,
  GRAMMAR_ITEMS,
  LISTENING_PASSAGES,
  PSEUDOWORDS,
  PSEUDOWORDS_PER_TEST,
  READ_ALOUD_ITEMS,
  READING_PASSAGES,
  SPEAKING_PROMPTS,
  VOCAB_BANDS,
  VOCAB_ITEMS_PER_BAND,
  WRITING_PROMPTS,
  BEYOND_NGSL,
  type DictationItem,
  type GrammarItem,
  type Passage,
  type ReadAloudItem,
} from '../content/assessment';
import { NGSL } from '../content/vocab.generated';
import {
  blendScores,
  estimateVocabSize,
  rubricScore,
  scoreToCefr,
  sectionScore,
  vocabSizeToScore,
  type ItemResult,
  type VocabAnswer,
} from './scoring';
import { CEFR_LEVELS, SKILLS, type CefrEstimate, type Skill, type SkillScores } from './types';

export type AssessmentKind = 'diagnostic' | 'weekly';

export interface VocabTestItem {
  word: string;
  band: string | null;
}

export interface AssessmentForm {
  kind: AssessmentKind;
  form: 1 | 2;
  vocab: VocabTestItem[];
  grammar: GrammarItem[];
  reading: Passage[];
  listening: Passage[];
  dictation: DictationItem[];
  readAloud: ReadAloudItem[];
  speakingPrompt: string;
  writingPrompt: string;
}

/** PRNG determinista (mulberry32), para tests reproducibles. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(items: readonly T[], n: number, rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy.slice(0, n);
}

/**
 * Arma un formulario.
 * - Diagnóstico: formulario 1 completo (~40 min).
 * - Re-evaluación semanal (~25 min): alterna formularios 2 y 1; gramática con los ítems menos vistos.
 * El vocabulario se muestrea al azar cada vez (hay miles de palabras), así que no se repite.
 */
export function buildAssessmentForm(params: {
  kind: AssessmentKind;
  previousCount: number;
  seenGrammar: ReadonlyMap<string, number>;
  rand: () => number;
}): AssessmentForm {
  const { kind, rand } = params;
  const form: 1 | 2 = kind === 'diagnostic' ? 1 : params.previousCount % 2 === 1 ? 2 : 1;
  const perBand = kind === 'diagnostic' ? VOCAB_ITEMS_PER_BAND : 8;
  const pseudoCount = kind === 'diagnostic' ? PSEUDOWORDS_PER_TEST : 10;

  const vocab: VocabTestItem[] = [];
  for (const band of VOCAB_BANDS) {
    const pool = band.ngslRange
      ? NGSL.filter(([, rank]) => rank >= (band.ngslRange?.[0] ?? 0) && rank <= (band.ngslRange?.[1] ?? 0)).map(([lemma]) => lemma)
      : BEYOND_NGSL;
    for (const word of sample(pool, perBand, rand)) vocab.push({ word, band: band.id });
  }
  for (const word of sample(PSEUDOWORDS, pseudoCount, rand)) vocab.push({ word, band: null });

  let grammar: GrammarItem[];
  if (kind === 'diagnostic') {
    grammar = GRAMMAR_ITEMS.filter((g) => g.diagnostic);
  } else {
    grammar = CEFR_LEVELS.flatMap((level) => {
      const pool = GRAMMAR_ITEMS.filter((g) => g.level === level);
      // Menos vistos primero; desempate aleatorio.
      const ranked = sample(pool, pool.length, rand).sort((a, b) => (params.seenGrammar.get(a.id) ?? 0) - (params.seenGrammar.get(b.id) ?? 0));
      return ranked.slice(0, 3);
    });
  }

  const byForm = <T extends { form: 1 | 2; level: string }>(items: readonly T[]) =>
    items.filter((i) => i.form === form && (kind === 'diagnostic' || i.level !== 'A2'));

  return {
    kind,
    form,
    vocab: sample(vocab, vocab.length, rand),
    grammar,
    reading: byForm(READING_PASSAGES),
    listening: byForm(LISTENING_PASSAGES),
    dictation: DICTATION_ITEMS.filter((d) => d.form === form),
    readAloud: READ_ALOUD_ITEMS.filter((r) => r.form === form),
    speakingPrompt: SPEAKING_PROMPTS[form],
    writingPrompt: WRITING_PROMPTS[form],
  };
}

export interface AssessmentResponses {
  vocab: VocabAnswer[] | null;
  grammar: ItemResult[] | null;
  reading: ItemResult[] | null;
  /** Preguntas de comprensión + dictados (crédito parcial). */
  listening: ItemResult[] | null;
  /** Precisión del reconocimiento de voz en lectura en voz alta; null si no hubo micrófono. */
  readAloud: ItemResult[] | null;
  speakingRubric: number[] | null;
  writingRubric: number[] | null;
}

export interface AssessmentScores {
  /** null = sección omitida. */
  scores: Record<Skill, number | null>;
  levels: Record<Skill, CefrEstimate | null>;
  vocabSize: number | null;
  /** Tasa de "sí" a pseudopalabras (si es alta, el puntaje de vocabulario es poco confiable). */
  falseAlarmRate: number | null;
}

export function scoreAssessment(r: AssessmentResponses): AssessmentScores {
  let vocabSize: number | null = null;
  let falseAlarmRate: number | null = null;
  let vocab: number | null = null;
  if (r.vocab && r.vocab.length > 0) {
    const est = estimateVocabSize(r.vocab, VOCAB_BANDS);
    vocabSize = est.size;
    falseAlarmRate = est.falseAlarmRate;
    vocab = vocabSizeToScore(est.size);
  }
  const sec = (x: ItemResult[] | null) => (x && x.length > 0 ? sectionScore(x) : null);
  const speakingSelf = r.speakingRubric && r.speakingRubric.length > 0 ? rubricScore(r.speakingRubric) : null;
  const readAloud = sec(r.readAloud);
  const speaking = speakingSelf === null ? readAloud : blendScores(readAloud, speakingSelf);
  const writing = r.writingRubric && r.writingRubric.length > 0 ? rubricScore(r.writingRubric) : null;

  const scores: Record<Skill, number | null> = {
    vocab,
    grammar: sec(r.grammar),
    reading: sec(r.reading),
    listening: sec(r.listening),
    speaking,
    writing,
  };
  const levels = Object.fromEntries(SKILLS.map((s) => [s, scores[s] === null ? null : scoreToCefr(scores[s])])) as Record<Skill, CefrEstimate | null>;
  return { scores, levels, vocabSize, falseAlarmRate };
}

/** Rellena secciones omitidas con el puntaje anterior (o 30 ≈ A1 si no hay). */
export function completeScores(current: Record<Skill, number | null>, previous: SkillScores | null): SkillScores {
  return Object.fromEntries(SKILLS.map((s) => [s, current[s] ?? previous?.[s] ?? 30])) as SkillScores;
}

/** Rango NGSL desde el cual conviene empezar las tarjetas nuevas según el test. */
export function suggestedStartRank(perBandKnown: Record<string, number>): number {
  // Si dominas ≥ 90 % de una banda, se salta (las de esa banda se marcan como conocidas).
  if ((perBandKnown.k1a ?? 0) < 90) return 1;
  if ((perBandKnown.k1b ?? 0) < 90) return 501;
  return 1001;
}
