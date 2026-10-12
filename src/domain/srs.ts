import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

export { Rating, State };
export type { Grade };

/** Tarjeta tal como se guarda en IndexedDB (fechas como milisegundos). */
export interface StoredCard {
  id: string;
  /** Lema o expresión al que corresponde la tarjeta. */
  ref: string;
  kind: 'word' | 'phrase';
  /** Rango de frecuencia (1 = más frecuente). Ordena la introducción de tarjetas nuevas. */
  rank: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review: number | null;
  /** 1 = la marqué como "ya la sé" (fuera de la cola). IndexedDB no indexa booleanos. */
  known: 0 | 1;
  updatedAt: number;
}

export interface StoredReviewLog {
  id: string;
  cardId: string;
  rating: Grade;
  state: State;
  review: number;
  durationMs: number;
  dayKey: string;
}

export interface SrsSettings {
  /** Retención objetivo (0,70–0,97). */
  retention: number;
  newPerDay: number;
}

export const DEFAULT_SRS_SETTINGS: SrsSettings = { retention: 0.9, newPerDay: 25 };

function scheduler(settings: SrsSettings) {
  return fsrs({
    request_retention: settings.retention,
    maximum_interval: 365,
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
  });
}

function toFsrsCard(c: StoredCard): Card {
  const card: Card = {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
  };
  if (c.last_review !== null) card.last_review = new Date(c.last_review);
  return card;
}

function applyFsrsCard(base: StoredCard, card: Card, now: number): StoredCard {
  return {
    ...base,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- ts-fsrs 5.x aún expone y exige este campo
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.getTime() : null,
    updatedAt: now,
  };
}

export function newStoredCard(params: { id: string; ref: string; kind: StoredCard['kind']; rank: number; now: number }): StoredCard {
  const empty = createEmptyCard(new Date(params.now));
  return applyFsrsCard(
    { id: params.id, ref: params.ref, kind: params.kind, rank: params.rank, known: 0 } as StoredCard,
    empty,
    params.now,
  );
}

export function reviewCard(
  card: StoredCard,
  rating: Grade,
  now: number,
  settings: SrsSettings,
): StoredCard {
  const result = scheduler(settings).next(toFsrsCard(card), new Date(now), rating);
  return applyFsrsCard(card, result.card, now);
}

/** Intervalo propuesto para cada calificación (para mostrar en los botones). */
export function previewIntervals(card: StoredCard, now: number, settings: SrsSettings): Record<Grade, number> {
  const s = scheduler(settings);
  const base = toFsrsCard(card);
  const out = {} as Record<Grade, number>;
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const) {
    out[g] = s.next(base, new Date(now), g).card.due.getTime() - now;
  }
  return out;
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} d`;
  const mo = Math.round(d / 30);
  return `${mo} m`;
}

/**
 * Límite de tarjetas nuevas para hoy. Si hay mucho repaso acumulado se reduce,
 * para no generar una deuda que no se pueda pagar en ~45 min diarios.
 */
export function newCardAllowance(params: {
  newPerDay: number;
  introducedToday: number;
  dueCount: number;
  /** Repasos pendientes a partir de los cuales se empieza a recortar. */
  backlogThreshold?: number;
}): number {
  const threshold = params.backlogThreshold ?? 150;
  let limit = params.newPerDay;
  if (params.dueCount > threshold) {
    // Por cada 10 repasos sobre el umbral, 1 tarjeta nueva menos.
    limit -= Math.ceil((params.dueCount - threshold) / 10);
  }
  return Math.max(0, limit - params.introducedToday);
}

/** Construye la cola: primero las vencidas (más atrasadas primero), luego las nuevas por frecuencia. */
export function buildQueue(cards: readonly StoredCard[], now: number, newAllowance: number): StoredCard[] {
  const active = cards.filter((c) => c.known === 0);
  const due = active
    .filter((c) => c.state !== State.New && c.due <= now)
    .sort((a, b) => a.due - b.due);
  const fresh = active
    .filter((c) => c.state === State.New)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, Math.max(0, newAllowance));
  return [...due, ...fresh];
}

/** "Dominada": marcada como conocida, o en repaso con estabilidad ≥ 21 días. */
export function isMastered(c: StoredCard): boolean {
  return c.known === 1 || (c.state === State.Review && c.stability >= 21);
}
