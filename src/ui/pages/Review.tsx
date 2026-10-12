import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { db } from '../../db/db';
import { addSession, applyReview, getSettings, introducedOn, setKnown } from '../../db/repo';
import { NGSL } from '../../content/vocab.generated';
import {
  buildQueue,
  formatInterval,
  newCardAllowance,
  previewIntervals,
  Rating,
  State,
  type Grade,
  type StoredCard,
} from '../../domain/srs';
import { dayKey } from '../../domain/time';
import { SpeakButton } from '../components/Audio';
import { Loading } from './Loading';

const GLOSS = new Map(NGSL.filter((r) => r[2] !== undefined).map((r) => [r[0], { es: r[2] ?? '', ex: r[3] ?? '' }]));
const MAX_CARD_MS = 60_000;

const RATING_BUTTONS: { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: 'Otra vez' },
  { grade: Rating.Hard, label: 'Difícil' },
  { grade: Rating.Good, label: 'Bien' },
  { grade: Rating.Easy, label: 'Fácil' },
];

interface ReviewState {
  queue: StoredCard[];
  intervals: Record<Grade, number> | null;
  /** ms hasta que vuelva la próxima tarjeta en aprendizaje (null si no hay). */
  nextLearningIn: number | null;
  rate: number;
  loadedAt: number;
}

/** Carga la cola desde IndexedDB (fuera del render: usa la hora actual). */
async function loadReviewState(): Promise<ReviewState> {
  const settings = await getSettings(db);
  const now = Date.now();
  const cards = await db.cards.toArray();
  const intro = await introducedOn(db, dayKey(new Date(now)));
  const due = cards.filter((c) => c.known === 0 && c.state !== State.New && c.due <= now).length;
  const allowance = newCardAllowance({ newPerDay: settings.srs.newPerDay, introducedToday: intro, dueCount: due });
  const queue = buildQueue(cards, now, allowance);
  const nextLearning = cards
    .filter((c) => c.known === 0 && (c.state === State.Learning || c.state === State.Relearning) && c.due > now)
    .map((c) => c.due)
    .sort((a, b) => a - b)[0];
  const first = queue[0];
  return {
    queue,
    intervals: first ? previewIntervals(first, now, settings.srs) : null,
    nextLearningIn: nextLearning === undefined ? null : nextLearning - now,
    rate: settings.ttsRate,
    loadedAt: now,
  };
}

interface SessionStats {
  ms: number;
  total: number;
  again: number;
  startedAt: number;
}

async function saveStats(stats: SessionStats): Promise<void> {
  if (stats.total === 0) return;
  await addSession(db, {
    dayKey: dayKey(new Date()),
    module: 'srs',
    kind: 'active',
    startedAt: stats.startedAt,
    endedAt: Date.now(),
    seconds: stats.ms / 1000,
    score: Math.round(((stats.total - stats.again) / stats.total) * 100),
  });
}

/** Aplica una calificación y acumula el tiempo activo de la tarjeta (máx. 60 s). */
async function rateAndRecord(card: StoredCard, grade: Grade, shownAt: number, stats: SessionStats): Promise<void> {
  const now = Date.now();
  const dur = Math.min(MAX_CARD_MS, Math.max(0, now - shownAt));
  stats.ms += dur;
  stats.total += 1;
  if (grade === Rating.Again) stats.again += 1;
  await applyReview(db, { card, rating: grade, now, durationMs: dur });
}

/**
 * Sesión de repetición espaciada. Registra como tiempo activo la suma del tiempo por tarjeta
 * (máx. 60 s cada una), para no contar tiempo con el teléfono olvidado en la mesa.
 */
export function ReviewPage({ limitMinutes, onFinished }: { limitMinutes?: number; onFinished?: () => void }) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeMs, setActiveMs] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stats = useRef<SessionStats>({ ms: 0, total: 0, again: 0, startedAt: 0 });
  const saved = useRef(false);

  const refresh = () =>
    loadReviewState().then((s) => {
      setState(s);
      setRevealed(false);
    });

  useEffect(() => {
    let alive = true;
    stats.current.startedAt = Date.now();
    void loadReviewState().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const saveOnce = async () => {
    if (saved.current) return;
    saved.current = true;
    await saveStats(stats.current);
  };

  // Guarda al salir de la pantalla.
  useEffect(
    () => () => {
      if (!saved.current) {
        saved.current = true;
        void saveStats(stats.current);
      }
    },
    [],
  );

  if (!state) return <Loading />;
  const card = state.queue[0];
  const limitReached = limitMinutes !== undefined && activeMs >= limitMinutes * 60_000;

  const rateCard = async (grade: Grade) => {
    if (!card) return;
    try {
      await rateAndRecord(card, grade, state.loadedAt, stats.current);
      setActiveMs(stats.current.ms);
      setReviewed((n) => n + 1);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el repaso.');
    }
  };

  const markKnown = async () => {
    if (!card) return;
    await setKnown(db, card.id, true);
    await refresh();
  };

  const finish = async () => {
    await saveOnce();
    onFinished?.();
  };

  if (!card || limitReached) {
    return (
      <div className="stack section">
        <div className="card stack center">
          <h1>{limitReached ? 'Tiempo cumplido' : '¡Listo por ahora!'}</h1>
          <p>Repasaste {reviewed} tarjetas en esta sesión.</p>
          {!limitReached && state.nextLearningIn !== null && (
            <p className="small">
              Hay tarjetas en aprendizaje que vuelven en {formatInterval(state.nextLearningIn)}.{' '}
              <button type="button" className="btn small" onClick={() => { void refresh(); }}>Revisar de nuevo</button>
            </p>
          )}
          {onFinished ? (
            <button type="button" className="btn primary" onClick={() => { void finish(); }}>Continuar</button>
          ) : (
            <Link className="btn primary" to="/" onClick={() => { void saveOnce(); }}>Volver a Hoy</Link>
          )}
        </div>
      </div>
    );
  }

  const gloss = GLOSS.get(card.ref);
  return (
    <div className="stack">
      <div className="row between small">
        <span>{state.queue.length} en cola · {reviewed} repasadas</span>
        <span>{card.state === State.New ? <span className="badge">nueva · #{card.rank}</span> : <span className="badge">repaso</span>}</span>
      </div>
      <div className="card flash" data-testid="flashcard">
        <div className="word" lang="en">{card.ref}</div>
        <SpeakButton text={card.ref} rate={state.rate} />
        {revealed ? (
          <>
            <div className="gloss" data-testid="gloss">{gloss?.es}</div>
            {gloss?.ex && (
              <div className="row" style={{ justifyContent: 'center' }}>
                <span className="example" lang="en">{gloss.ex}</span>
                <SpeakButton text={gloss.ex} rate={state.rate} label="Frase" />
              </div>
            )}
            <span className="small muted">Traducción y ejemplo generados: a verificar.</span>
          </>
        ) : (
          <p className="muted small">¿Qué significa? Piénsalo y luego muestra la respuesta.</p>
        )}
      </div>
      {error && <div className="alert bad" role="alert">{error}</div>}
      {revealed ? (
        <div className="ratings">
          {RATING_BUTTONS.map((r) => (
            <button key={r.grade} type="button" className={`btn ${r.grade === Rating.Good ? 'primary' : ''}`} onClick={() => { void rateCard(r.grade); }}>
              {r.label}
              <small>{state.intervals ? formatInterval(state.intervals[r.grade]) : ''}</small>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="btn primary block" onClick={() => { setRevealed(true); }}>Mostrar respuesta</button>
      )}
      <div className="row between">
        {card.state === State.New ? (
          <button type="button" className="btn ghost small" onClick={() => { void markKnown(); }}>Ya la sé (no mostrar más)</button>
        ) : <span />}
        {!onFinished && <Link className="btn ghost small" to="/" onClick={() => { void saveOnce(); }}>Terminar</Link>}
      </div>
    </div>
  );
}
