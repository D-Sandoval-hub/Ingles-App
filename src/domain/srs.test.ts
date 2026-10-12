import { describe, expect, it } from 'vitest';
import {
  buildQueue,
  DEFAULT_SRS_SETTINGS,
  isMastered,
  newCardAllowance,
  newStoredCard,
  previewIntervals,
  Rating,
  reviewCard,
  State,
  type StoredCard,
} from './srs';

const NOW = new Date('2026-10-12T10:00:00').getTime();
const DAY = 86_400_000;

function card(id: string, rank: number): StoredCard {
  return newStoredCard({ id, ref: id, kind: 'word', rank, now: NOW });
}

describe('FSRS wrapper', () => {
  it('crea tarjetas nuevas vencidas ahora', () => {
    const c = card('a', 1);
    expect(c.state).toBe(State.New);
    expect(c.due).toBe(NOW);
    expect(c.reps).toBe(0);
    expect(c.last_review).toBeNull();
  });

  it('"Otra vez" programa en minutos, "Fácil" en días', () => {
    const c = card('a', 1);
    const again = reviewCard(c, Rating.Again, NOW, DEFAULT_SRS_SETTINGS);
    const easy = reviewCard(c, Rating.Easy, NOW, DEFAULT_SRS_SETTINGS);
    expect(again.due - NOW).toBeLessThan(15 * 60_000);
    expect(easy.due - NOW).toBeGreaterThanOrEqual(DAY);
    expect(easy.state).toBe(State.Review);
    expect(again.last_review).toBe(NOW);
  });

  it('los intervalos crecen con repasos exitosos', () => {
    let c = card('a', 1);
    let t = NOW;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      c = reviewCard(c, Rating.Good, t, { ...DEFAULT_SRS_SETTINGS });
      intervals.push(c.due - t);
      t = c.due;
    }
    const last = intervals.at(-1) ?? 0;
    const third = intervals[2] ?? 0;
    expect(last).toBeGreaterThan(third);
    expect(c.state).toBe(State.Review);
  });

  it('un olvido cuenta como lapso y pasa a reaprendizaje', () => {
    let c = reviewCard(card('a', 1), Rating.Easy, NOW, DEFAULT_SRS_SETTINGS);
    c = reviewCard(c, Rating.Again, c.due, DEFAULT_SRS_SETTINGS);
    expect(c.lapses).toBe(1);
    expect(c.state).toBe(State.Relearning);
  });

  it('mayor retención objetivo => intervalos más cortos', () => {
    const base = reviewCard(card('a', 1), Rating.Good, NOW, DEFAULT_SRS_SETTINGS);
    const graduated = reviewCard(base, Rating.Good, base.due, DEFAULT_SRS_SETTINGS);
    const t = graduated.due;
    const lo = previewIntervals(graduated, t, { retention: 0.8, newPerDay: 20 })[Rating.Good];
    const hi = previewIntervals(graduated, t, { retention: 0.95, newPerDay: 20 })[Rating.Good];
    expect(hi).toBeLessThan(lo);
  });

  it('previewIntervals es monótono: Otra vez < Difícil <= Bien < Fácil', () => {
    const p = previewIntervals(card('a', 1), NOW, DEFAULT_SRS_SETTINGS);
    expect(p[Rating.Again]).toBeLessThan(p[Rating.Hard]);
    expect(p[Rating.Hard]).toBeLessThanOrEqual(p[Rating.Good]);
    expect(p[Rating.Good]).toBeLessThan(p[Rating.Easy]);
  });
});

describe('cola de repaso', () => {
  it('vencidas primero (más atrasada primero), luego nuevas por frecuencia, con límite', () => {
    const reviewed1 = { ...reviewCard(card('r1', 50), Rating.Good, NOW - 5 * DAY, DEFAULT_SRS_SETTINGS), due: NOW - DAY };
    const reviewed2 = { ...reviewCard(card('r2', 60), Rating.Good, NOW - 5 * DAY, DEFAULT_SRS_SETTINGS), due: NOW - 3 * DAY };
    const future = { ...reviewCard(card('f', 70), Rating.Good, NOW, DEFAULT_SRS_SETTINGS), due: NOW + DAY };
    const known: StoredCard = { ...card('k', 1), known: 1 };
    const q = buildQueue([card('n3', 30), card('n1', 10), card('n2', 20), reviewed1, reviewed2, future, known], NOW, 2);
    expect(q.map((c) => c.id)).toEqual(['r2', 'r1', 'n1', 'n2']);
  });

  it('el cupo de nuevas baja cuando hay mucho repaso acumulado', () => {
    expect(newCardAllowance({ newPerDay: 25, introducedToday: 0, dueCount: 100 })).toBe(25);
    expect(newCardAllowance({ newPerDay: 25, introducedToday: 5, dueCount: 100 })).toBe(20);
    expect(newCardAllowance({ newPerDay: 25, introducedToday: 0, dueCount: 200 })).toBe(20);
    expect(newCardAllowance({ newPerDay: 25, introducedToday: 0, dueCount: 500 })).toBe(0);
  });

  it('isMastered: conocida o estabilidad >= 21 días', () => {
    expect(isMastered({ ...card('a', 1), known: 1 })).toBe(true);
    expect(isMastered(card('a', 1))).toBe(false);
    expect(isMastered({ ...card('a', 1), state: State.Review, stability: 25 })).toBe(true);
  });
});
