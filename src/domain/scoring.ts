import { CEFR_LEVELS, type CefrEstimate, type CefrLevel, type Skill, type SkillScores } from './types';

/** Respuesta a un ítem objetivo (opción múltiple, comprensión, dictado). */
export interface ItemResult {
  level: CefrLevel;
  /** 0..1 (dictado y lectura en voz alta pueden dar crédito parcial). */
  credit: number;
}

/**
 * Puntaje 0–100 de una sección con ítems por nivel.
 * Cada nivel A1..C1 vale 20 puntos × su precisión.
 * Niveles sin ítems: los inferiores se asumen dominados si el nivel siguiente
 * con ítems tiene ≥ 60 %, y si no, se les da la precisión de ese nivel;
 * los superiores sin ítems valen 0.
 */
export function sectionScore(results: readonly ItemResult[]): number {
  const acc = new Map<CefrLevel, number>();
  for (const level of CEFR_LEVELS) {
    const items = results.filter((r) => r.level === level);
    if (items.length > 0) {
      acc.set(level, items.reduce((s, r) => s + clamp01(r.credit), 0) / items.length);
    }
  }
  if (acc.size === 0) return 0;
  const lowestWithItems = CEFR_LEVELS.findIndex((l) => acc.has(l));
  let score = 0;
  CEFR_LEVELS.forEach((level, i) => {
    const a = acc.get(level);
    if (a !== undefined) {
      score += 20 * a;
    } else if (i < lowestWithItems) {
      const next = acc.get(CEFR_LEVELS[lowestWithItems] as CefrLevel) ?? 0;
      score += 20 * (next >= 0.6 ? 1 : next);
    }
  });
  return round1(score);
}

/** Convierte un puntaje 0–100 en un nivel MCER aproximado. */
export function scoreToCefr(score: number): CefrEstimate {
  if (score < 20) return 'Pre-A1';
  if (score < 40) return 'A1';
  if (score < 60) return 'A2';
  if (score < 80) return 'B1';
  if (score < 95) return 'B2';
  return 'C1';
}

/** Banda del test de vocabulario sí/no. `size` = cuántas palabras representa la banda. */
export interface VocabBand {
  id: string;
  size: number;
}

export interface VocabAnswer {
  /** null = pseudopalabra. */
  band: string | null;
  saidYes: boolean;
}

/**
 * Estimación del tamaño de vocabulario con corrección por adivinanza:
 * ajustado = (aciertos − falsas alarmas) / (1 − falsas alarmas), recortado a [0, 1].
 * Es la corrección clásica de los tests sí/no (tipo X_Lex); es una aproximación.
 */
export function estimateVocabSize(answers: readonly VocabAnswer[], bands: readonly VocabBand[]): {
  size: number;
  falseAlarmRate: number;
  perBand: Record<string, number>;
} {
  const pseudo = answers.filter((a) => a.band === null);
  const fa = pseudo.length > 0 ? pseudo.filter((a) => a.saidYes).length / pseudo.length : 0;
  const perBand: Record<string, number> = {};
  let size = 0;
  for (const band of bands) {
    const items = answers.filter((a) => a.band === band.id);
    if (items.length === 0) continue;
    const hit = items.filter((a) => a.saidYes).length / items.length;
    const adjusted = fa >= 1 ? 0 : clamp01((hit - fa) / (1 - fa));
    perBand[band.id] = round1(adjusted * 100);
    size += adjusted * band.size;
  }
  return { size: Math.round(size), falseAlarmRate: fa, perBand };
}

/**
 * Tamaño de vocabulario → puntaje 0–100 sobre la misma escala de niveles
 * (cada 20 puntos = un nivel). Umbrales aproximados basados en estimaciones
 * publicadas de vocabulario por nivel MCER (Milton, 2010) — a verificar:
 * A1 < 1500, A2 1500–2500, B1 2500–3250, B2 3250–3750, C1 ≥ 3750.
 */
export function vocabSizeToScore(size: number): number {
  const points: readonly [number, number][] = [
    [0, 0],
    [750, 20],
    [1500, 40],
    [2500, 60],
    [3250, 80],
    [3750, 95],
    [4500, 100],
  ];
  if (size <= 0) return 0;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i] as [number, number];
    const [x0, y0] = points[i - 1] as [number, number];
    if (size <= x1) return round1(y0 + ((size - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 100;
}

/**
 * Rúbrica de autoevaluación (1–5 por criterio) → 0–100.
 * 1 ≈ Pre-A1/A1, 2 ≈ A2, 3 ≈ B1, 4 ≈ B2, 5 ≈ C1.
 */
export function rubricScore(ratings: readonly number[]): number {
  if (ratings.length === 0) return 0;
  const mean = ratings.reduce((s, r) => s + Math.min(5, Math.max(1, r)), 0) / ratings.length;
  // 1 → 30 (A1), 2 → 50 (A2), 3 → 70 (B1), 4 → 87 (B2), 5 → 97 (C1)
  const table = [30, 50, 70, 87, 97];
  const lo = Math.floor(mean) - 1;
  const hi = Math.min(4, lo + 1);
  const frac = mean - Math.floor(mean);
  const base = table[lo] ?? 30;
  const top = table[hi] ?? base;
  return round1(base + (top - base) * frac);
}

/**
 * Combina una medida objetiva con la autoevaluación (habla, escritura).
 * Sin medida objetiva usa solo la autoevaluación.
 */
export function blendScores(objective: number | null, selfAssessed: number, objectiveWeight = 0.5): number {
  if (objective === null) return round1(selfAssessed);
  return round1(objective * objectiveWeight + selfAssessed * (1 - objectiveWeight));
}

export function overallScore(scores: SkillScores): number {
  const values = Object.values(scores);
  return round1(values.reduce((s, v) => s + v, 0) / values.length);
}

/** Habilidad más débil (desempate por orden fijo). */
export function weakestSkill(scores: SkillScores): Skill {
  let best: Skill = 'vocab';
  let min = Infinity;
  for (const [skill, v] of Object.entries(scores) as [Skill, number][]) {
    if (v < min) {
      min = v;
      best = skill;
    }
  }
  return best;
}

// ---- Comparación de texto (dictado, lectura en voz alta) ----

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/** Precisión por palabras: 1 − distancia de edición (en palabras) / largo del objetivo. */
export function wordAccuracy(target: string, attempt: string): number {
  const a = normalizeWords(target);
  const b = normalizeWords(attempt);
  if (a.length === 0) return b.length === 0 ? 1 : 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] as number;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j] as number;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min((prev[j] as number) + 1, (prev[j - 1] as number) + 1, diag + cost);
      diag = tmp;
    }
  }
  const dist = prev[b.length] as number;
  return clamp01(1 - dist / a.length);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
