import { useState } from 'react';
import { Link } from 'react-router';
import { db } from '../../db/db';
import { addErrorEvents, addSession } from '../../db/repo';
import { pickPractice, type PracticeStep } from '../../domain/practice';
import { topErrors } from '../../domain/errors';
import { dayKey } from '../../domain/time';
import { deriveToday } from '../derive';
import { useAppData } from '../data';
import { pickDictation, pickGrammar } from '../activities';
import { Dictation, McqSeries } from '../components/Exercises';
import { ReviewPage } from './Review';
import { Loading } from './Loading';

const LABELS = { srs: 'Tarjetas vencidas', grammar: 'Gramática', dictation: 'Dictado' } as const;

/** Práctica libre: sesiones cortas que eligen solas lo que más necesitas. */
export function PracticePage() {
  const data = useAppData();
  const [plan, setPlan] = useState<PracticeStep[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepStart, setStepStart] = useState(() => Date.now());

  if (!data) return <Loading />;
  const t = deriveToday({ ...data, now: new Date() });
  if (!t) return <Loading />;

  if (!plan) {
    return (
      <div className="stack">
        <div className="row between">
          <h1 style={{ margin: 0 }}>Práctica libre</h1>
          <Link to="/" className="btn ghost small">Volver</Link>
        </div>
        <p>Elige cuánto tiempo tienes. La app decide qué repasar: primero tarjetas vencidas, luego tu habilidad más débil.</p>
        <div className="row">
          {[5, 10, 15].map((m) => (
            <button key={m} type="button" className="btn primary grow" onClick={() => { setPlan(pickPractice({ minutes: m, dueCount: data.cardStats.due, scores: t.scores })); setStepIndex(0); setStepStart(Date.now()); }}>
              {m} min
            </button>
          ))}
        </div>
      </div>
    );
  }

  const step = plan[stepIndex];
  const next = () => {
    setStepIndex((i) => i + 1);
    setStepStart(Date.now());
  };
  const saveStep = async (module: 'grammar_writing' | 'listening', credits: number[]) => {
    const seconds = Math.min((Date.now() - stepStart) / 1000, (step?.minutes ?? 15) * 60 * 2);
    await addSession(db, {
      dayKey: dayKey(new Date()),
      module,
      kind: 'active',
      startedAt: stepStart,
      endedAt: Date.now(),
      seconds,
      score: credits.length > 0 ? Math.round((credits.reduce((s, c) => s + c, 0) / credits.length) * 100) : null,
    });
  };

  if (!step) {
    return (
      <div className="card stack center section">
        <h1>¡Práctica terminada!</h1>
        <Link className="btn primary" to="/">Volver a Hoy</Link>
      </div>
    );
  }

  const recurrent = topErrors(data.errorEvents.map((e) => e.tag)).map((e) => e.tag);
  return (
    <div className="stack">
      <div className="small">Paso {stepIndex + 1} de {plan.length}: <strong>{LABELS[step.activity]}</strong> (~{step.minutes} min)</div>
      {step.activity === 'srs' && <ReviewPage key={`srs-${stepIndex}`} limitMinutes={step.minutes} onFinished={next} />}
      {step.activity === 'grammar' && (
        <PracticeGrammar key={`g-${stepIndex}`} score={t.scores.grammar} n={Math.max(3, step.minutes)} recurrent={recurrent} onDone={(c) => { void saveStep('grammar_writing', c).then(next); }} />
      )}
      {step.activity === 'dictation' && (
        <PracticeDictation key={`d-${stepIndex}`} score={t.scores.listening} n={Math.max(2, Math.round(step.minutes / 1.5))} rate={data.settings.ttsRate} onDone={(c) => { void saveStep('listening', c).then(next); }} />
      )}
    </div>
  );
}

function PracticeGrammar({ score, n, recurrent, onDone }: { score: number; n: number; recurrent: string[]; onDone: (c: number[]) => void }) {
  const [items] = useState(() => pickGrammar(score, n, recurrent));
  return (
    <div className="card">
      <McqSeries
        items={items}
        feedback
        onEach={(item, correct) => {
          if (!correct) void addErrorEvents(db, [{ tag: item.tag, example: item.prompt, at: Date.now(), source: 'grammar' }]);
        }}
        onDone={(r) => { onDone(r.map((x) => (x.correct ? 1 : 0))); }}
      />
    </div>
  );
}

function PracticeDictation({ score, n, rate, onDone }: { score: number; n: number; rate: number; onDone: (c: number[]) => void }) {
  const [items] = useState(() => pickDictation(score, n));
  return (
    <div className="card">
      <Dictation items={items} rate={rate} onDone={(r) => { onDone(r.map((x) => x.credit)); }} />
    </div>
  );
}
