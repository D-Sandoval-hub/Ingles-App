import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { db } from '../../db/db';
import { addErrorEvents, addSession } from '../../db/repo';
import { topErrors } from '../../domain/errors';
import { dayKey } from '../../domain/time';
import { MODULE_LABELS } from '../../domain/types';
import { objectivesFor } from '../../content/curriculum';
import { resourcesForLevel } from '../../content/resources';
import { deriveToday } from '../derive';
import { useAppData } from '../data';
import { pickDictation, pickGrammar, speakingPrompts, tutorPrompt, writingPrompt } from '../activities';
import { BlockTimer, useBlockTimer } from '../components/Timer';
import { CopyPrompt, Dictation, ErrorList, McqSeries, ReadAloud, WritingBox } from '../components/Exercises';
import { MicButton } from '../components/Audio';
import { detectErrors, type DetectedError } from '../../domain/errors';
import { scoreToCefr } from '../../domain/scoring';
import { Loading } from './Loading';

const BLOCK_MODULES = ['listening', 'pronunciation', 'conversation', 'grammar_writing', 'review'] as const;
type BlockModule = (typeof BLOCK_MODULES)[number];

function isBlockModule(m: string | undefined): m is BlockModule {
  return (BLOCK_MODULES as readonly string[]).includes(m ?? '');
}

export function BlockPage() {
  const { module } = useParams();
  if (!isBlockModule(module)) return <Navigate to="/" replace />;
  return <BlockRunner key={module} module={module} />;
}

function BlockRunner({ module }: { module: BlockModule }) {
  const data = useAppData();
  const navigate = useNavigate();
  const todayKey = dayKey(new Date());
  const timer = useBlockTimer(`timer:${todayKey}:${module}`);
  const [credits, setCredits] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!data) return <Loading />;
  const t = deriveToday({ ...data, now: new Date() });
  if (!t) return <Navigate to="/bienvenida" replace />;
  const planned = t.plan.blocks.find((b) => b.module === module)?.minutes ?? 30;
  const objectives = objectivesFor(module, t.studyWeek);
  const addCredits = (cs: number[]) => {
    setCredits((prev) => [...prev, ...cs]);
  };

  const finish = async () => {
    const seconds = timer.finish();
    if (seconds < 60 && credits.length === 0) {
      await navigate('/');
      return;
    }
    try {
      await addSession(db, {
        dayKey: todayKey,
        module,
        kind: 'active',
        startedAt: Date.now() - seconds * 1000,
        endedAt: Date.now(),
        seconds,
        score: credits.length > 0 ? Math.round((credits.reduce((s, c) => s + c, 0) / credits.length) * 100) : null,
      });
      await navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la sesión.');
    }
  };

  const recurrent = topErrors(data.errorEvents.map((e) => e.tag)).map((e) => e.tag);
  const rate = data.settings.ttsRate;

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>{MODULE_LABELS[module]}</h1>
        <Link to="/" className="btn ghost small">Volver</Link>
      </div>
      <BlockTimer timer={timer} plannedMinutes={planned} />
      {objectives.length > 0 && (
        <div className="card">
          <h3>Objetivos (semana {Math.min(t.studyWeek, 99)})</h3>
          <ul>{objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
      )}
      {!timer.running && timer.activeSeconds === 0 && <div className="alert info small">Inicia el temporizador para registrar el tiempo del bloque.</div>}

      {module === 'listening' && <ListeningActivity score={t.scores.listening} rate={rate} onCredits={addCredits} />}
      {module === 'pronunciation' && <PronunciationActivity score={t.scores.speaking} rate={rate} onCredits={addCredits} />}
      {module === 'conversation' && <ConversationActivity week={t.studyWeek} level={scoreToCefr(t.scores.speaking)} />}
      {module === 'grammar_writing' && <GrammarWritingActivity score={t.scores.grammar} level={scoreToCefr(t.scores.writing)} recurrent={recurrent} onCredits={addCredits} />}
      {module === 'review' && <ReviewActivity score={t.scores.grammar} listening={t.scores.listening} rate={rate} recurrent={recurrent} onCredits={addCredits} />}

      {error && <div className="alert bad" role="alert">{error}</div>}
      <button type="button" className="btn primary block" onClick={() => { void finish(); }} data-testid="finish-block">
        Terminar bloque y guardar
      </button>
    </div>
  );
}

/** Sortea los ítems una sola vez por montaje (el temporizador re-renderiza cada segundo). */
function Fixed<T>({ pick, children }: { pick: () => T; children: (value: T) => ReactNode }) {
  const [value] = useState(pick);
  return <>{children(value)}</>;
}

function Round({ children, onAgain, label = 'Otra ronda' }: { children: (key: number) => ReactNode; onAgain?: () => void; label?: string }) {
  const [round, setRound] = useState(0);
  return (
    <div className="stack">
      {children(round)}
      <button type="button" className="btn small" onClick={() => { setRound((r) => r + 1); onAgain?.(); }}>{label}</button>
    </div>
  );
}

function ListeningActivity({ score, rate, onCredits }: { score: number; rate: number; onCredits: (c: number[]) => void }) {
  const [done, setDone] = useState(false);
  return (
    <>
      <div className="card">
        <h3>Dictado</h3>
        <Round onAgain={() => { setDone(false); }}>
          {(k) =>
            done ? <p className="small">Ronda terminada.</p> : (
              <Fixed key={k} pick={() => pickDictation(score, 5)}>{(items) => <Dictation items={items} rate={rate} onDone={(r) => { onCredits(r.map((x) => x.credit)); setDone(true); }} />}</Fixed>
            )
          }
        </Round>
      </div>
      <ResourceList score={score} title="Audio nativo (externo)" />
    </>
  );
}

function PronunciationActivity({ score, rate, onCredits }: { score: number; rate: number; onCredits: (c: number[]) => void }) {
  const [done, setDone] = useState(false);
  return (
    <>
      <div className="card stack">
        <h3>Shadowing con frases</h3>
        <p className="small">Escucha el modelo, repítelo imitando ritmo y entonación, y luego léelo para el reconocedor. La retroalimentación es aproximada.</p>
        <Round onAgain={() => { setDone(false); }}>
          {(k) =>
            done ? <p className="small">Ronda terminada.</p> : (
              <Fixed key={k} pick={() => pickDictation(score, 4)}>{(items) => <ReadAloud items={items} rate={rate} onDone={(r) => { if (r) onCredits(r.map((x) => x.credit)); setDone(true); }} />}</Fixed>
            )
          }
        </Round>
      </div>
      <div className="card small">
        <strong>Pares mínimos y errores típicos</strong> (módulo completo en la Fase 2): ship/sheep, live/leave, b/v, th, consonantes finales, schwa, acento de palabra. Mientras tanto, busca estos temas en <a href="https://www.youtube.com/results?search_query=Rachel%27s+English+minimal+pairs" target="_blank" rel="noopener noreferrer">Rachel&apos;s English</a>.
      </div>
    </>
  );
}

function ConversationActivity({ week, level }: { week: number; level: string }) {
  const prompts = speakingPrompts(week);
  const [transcript, setTranscript] = useState('');
  const [errors, setErrors] = useState<DetectedError[] | null>(null);
  return (
    <>
      <div className="card stack">
        <h3>Habla 2–3 minutos sobre:</h3>
        <ul>{prompts.map((p) => <li key={p} lang="en">{p}</li>)}</ul>
        <MicButton
          continuous
          label="Grabar (toca de nuevo para terminar)"
          onResult={(text) => {
            setTranscript(text);
            const found = detectErrors(text);
            setErrors(found);
            void addErrorEvents(db, found.map((e) => ({ tag: e.tag, example: e.match, at: Date.now(), source: 'writing' as const })));
          }}
        />
        {transcript && (
          <div className="stack">
            <div className="small">Transcripción (puede tener errores del reconocedor):</div>
            <p lang="en"><em>{transcript}</em></p>
            {errors && <ErrorList errors={errors} />}
          </div>
        )}
      </div>
      <CopyPrompt title="Tutor de conversación gratis (copiar y pegar en Claude)" text={tutorPrompt(level, prompts[0] ?? 'small talk')} />
      <div className="alert info small">El tutor IA integrado (Fase 3) requiere una API de pago, por eso no está activo. Esta alternativa es gratuita.</div>
    </>
  );
}

function GrammarWritingActivity({ score, level, recurrent, onCredits }: { score: number; level: string; recurrent: string[]; onCredits: (c: number[]) => void }) {
  const [done, setDone] = useState(false);
  return (
    <>
      <div className="card">
        <h3>Gramática: errores típicos</h3>
        <Round onAgain={() => { setDone(false); }}>
          {(k) =>
            done ? <p className="small">Ronda terminada.</p> : (
              <Fixed key={k} pick={() => pickGrammar(score, 6, recurrent)}>{(items) => <McqSeries
                items={items}
                feedback
                onEach={(item, correct) => {
                  if (!correct) void addErrorEvents(db, [{ tag: item.tag, example: item.prompt, at: Date.now(), source: 'grammar' }]);
                }}
                onDone={(r) => { onCredits(r.map((x) => (x.correct ? 1 : 0))); setDone(true); }}
              />}</Fixed>
            )
          }
        </Round>
      </div>
      <div className="card">
        <h3>Escritura</h3>
        <WritingBox
          prompt="Write 5–8 sentences about your day, your work, or your plans. Then check it."
          onSubmit={(_text, errors) => {
            void addErrorEvents(db, errors.map((e) => ({ tag: e.tag, example: e.match, at: Date.now(), source: 'writing' as const })));
          }}
        />
      </div>
      <CopyPrompt title="Corrección completa gratis (copiar y pegar en Claude)" text={writingPrompt(level)} />
    </>
  );
}

function ReviewActivity({ score, listening, rate, recurrent, onCredits }: { score: number; listening: number; rate: number; recurrent: string[]; onCredits: (c: number[]) => void }) {
  const [step, setStep] = useState<'grammar' | 'dictation' | 'done'>('grammar');
  return (
    <div className="card stack">
      <h3>Repaso de la semana</h3>
      <p className="small">Primero tus errores recurrentes, luego un dictado.</p>
      {step === 'grammar' && <Fixed pick={() => pickGrammar(score, 8, recurrent)}>{(items) => <McqSeries items={items} feedback onDone={(r) => { onCredits(r.map((x) => (x.correct ? 1 : 0))); setStep('dictation'); }} />}</Fixed>}
      {step === 'dictation' && <Fixed pick={() => pickDictation(listening, 4)}>{(items) => <Dictation items={items} rate={rate} onDone={(r) => { onCredits(r.map((x) => x.credit)); setStep('done'); }} />}</Fixed>}
      {step === 'done' && <p>Repaso terminado. Puedes seguir con tarjetas o input.</p>}
    </div>
  );
}

export function ResourceList({ score, title }: { score: number; title: string }) {
  const list = resourcesForLevel(scoreToCefr(score));
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="small">Enlaces externos: la app no reproduce su contenido. Transcripciones y disponibilidad pueden cambiar.</p>
      {list.map((r) => (
        <div key={r.id} className="vocab-row">
          <div className="grow">
            <a href={r.url} target="_blank" rel="noopener noreferrer"><strong>{r.title}</strong></a>
            <div className="small">{r.description} · {r.accent} · {r.levels.join('/')} · transcripción: {r.transcripts}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
