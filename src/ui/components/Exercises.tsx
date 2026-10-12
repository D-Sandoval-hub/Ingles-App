import { useState } from 'react';
import { detectErrors, type DetectedError } from '../../domain/errors';
import { normalizeWords, wordAccuracy } from '../../domain/scoring';
import type { CefrLevel } from '../../domain/types';
import type { RubricCriterion } from '../../content/assessment';
import { MicButton, SpeakButton } from './Audio';
import { sttSupported } from '../../speech/stt';

export interface McqItem {
  id: string;
  prompt: string;
  options: readonly string[];
  answer: number;
  explanation?: string;
}

/** Pregunta de opción múltiple. Con `feedback`, muestra si fue correcta y la explicación. */
export function Mcq({ item, feedback, onAnswer }: { item: McqItem; feedback: boolean; onAnswer: (correct: boolean) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const answered = chosen !== null;
  return (
    <div className="stack" data-testid="mcq">
      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{item.prompt}</p>
      <div className="options">
        {item.options.map((opt, i) => {
          let cls = 'btn option';
          if (feedback && answered) {
            if (i === item.answer) cls += ' correct';
            else if (i === chosen) cls += ' wrong';
          } else if (chosen === i) cls += ' primary';
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              disabled={answered}
              onClick={() => {
                setChosen(i);
                if (!feedback) onAnswer(i === item.answer);
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {feedback && answered && (
        <div className="stack">
          <div className={`alert ${chosen === item.answer ? 'good' : 'bad'}`} role="status">
            <div>
              <strong>{chosen === item.answer ? '¡Correcto!' : `Respuesta: ${item.options[item.answer] ?? ''}`}</strong>
              {item.explanation && <div>{item.explanation}</div>}
            </div>
          </div>
          <button type="button" className="btn primary" onClick={() => { onAnswer(chosen === item.answer); }}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

/** Serie de preguntas una por una; al terminar entrega aciertos por ítem. */
export function McqSeries<T extends McqItem>({
  items,
  feedback,
  onDone,
  onEach,
  initialCorrect = [],
  onProgress,
}: {
  items: readonly T[];
  feedback: boolean;
  onDone: (results: { item: T; correct: boolean }[]) => void;
  onEach?: (item: T, correct: boolean) => void;
  /** Respuestas ya dadas (para retomar una serie a medias). */
  initialCorrect?: readonly boolean[];
  onProgress?: (correct: boolean[]) => void;
}) {
  const [index, setIndex] = useState(Math.min(initialCorrect.length, Math.max(0, items.length - 1)));
  const [results, setResults] = useState<{ item: T; correct: boolean }[]>(() =>
    initialCorrect.slice(0, items.length).flatMap((correct, i) => {
      const it = items[i];
      return it ? [{ item: it, correct }] : [];
    }),
  );
  const item = items[index];
  if (!item) return null;
  return (
    <div className="stack">
      <div className="small">Pregunta {index + 1} de {items.length}</div>
      <Mcq
        key={item.id}
        item={item}
        feedback={feedback}
        onAnswer={(correct) => {
          onEach?.(item, correct);
          const next = [...results, { item, correct }];
          setResults(next);
          onProgress?.(next.map((r) => r.correct));
          if (index + 1 >= items.length) onDone(next);
          else setIndex(index + 1);
        }}
      />
    </div>
  );
}

/** Diferencia palabra a palabra entre lo escrito y el original. */
function WordDiff({ target, attempt }: { target: string; attempt: string }) {
  const got = new Set(normalizeWords(attempt));
  return (
    <p>
      {target.split(/\s+/).map((w, i) => {
        const ok = got.has(normalizeWords(w)[0] ?? '');
        return (
          <span key={`${w}-${i}`} style={{ color: ok ? 'var(--good)' : 'var(--bad)', fontWeight: ok ? 400 : 700 }}>
            {w}{' '}
          </span>
        );
      })}
    </p>
  );
}

export interface DictationResult {
  id: string;
  level: CefrLevel;
  credit: number;
}

/** Dictado con voz sintética: escuchar, escribir, comparar. */
export function Dictation({ items, rate, feedback = true, onDone }: { items: readonly { id: string; level: CefrLevel; text: string }[]; rate: number; feedback?: boolean; onDone: (r: DictationResult[]) => void }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<number | null>(null);
  const [results, setResults] = useState<DictationResult[]>([]);
  const item = items[index];
  if (!item) return null;
  const next = (credit: number) => {
    const all = [...results, { id: item.id, level: item.level, credit }];
    setResults(all);
    setText('');
    setChecked(null);
    if (index + 1 >= items.length) onDone(all);
    else setIndex(index + 1);
  };
  return (
    <div className="stack" data-testid="dictation">
      <div className="small">Dictado {index + 1} de {items.length} · escucha y escribe exactamente lo que oyes</div>
      <div className="row">
        <SpeakButton text={item.text} rate={rate} label="Reproducir" small={false} />
        <SpeakButton text={item.text} rate={Math.max(0.5, rate - 0.25)} label="Lento" small={false} />
      </div>
      <label htmlFor={`dict-${item.id}`} className="sr-only">Lo que escuchaste</label>
      <input
        id={`dict-${item.id}`}
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={text}
        disabled={checked !== null}
        onChange={(e) => {
          setText(e.target.value);
        }}
        placeholder="Escribe aquí…"
      />
      {checked === null ? (
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const acc = wordAccuracy(item.text, text);
            if (feedback) setChecked(acc);
            else next(acc);
          }}
        >
          {feedback ? 'Revisar' : 'Siguiente'}
        </button>
      ) : (
        <div className="stack">
          <div className={`alert ${checked >= 0.8 ? 'good' : 'warn'}`} role="status">
            <div>
              <strong>{Math.round(checked * 100)} % de palabras correctas.</strong> Original:
              <WordDiff target={item.text} attempt={text} />
            </div>
          </div>
          <button type="button" className="btn primary" onClick={() => { next(checked); }}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

/** Lectura en voz alta con reconocimiento de voz. Retroalimentación APROXIMADA. */
export function ReadAloud({ items, rate, onDone }: { items: readonly { id: string; level: CefrLevel; text: string }[]; rate: number; onDone: (r: DictationResult[] | null) => void }) {
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [results, setResults] = useState<DictationResult[]>([]);
  if (!sttSupported()) {
    return (
      <div className="stack">
        <div className="alert warn">Tu navegador no tiene reconocimiento de voz, así que esta parte se omite. En Android usa Chrome.</div>
        <button type="button" className="btn primary" onClick={() => { onDone(null); }}>Continuar</button>
      </div>
    );
  }
  const item = items[index];
  if (!item) return null;
  const acc = heard === null ? null : wordAccuracy(item.text, heard);
  return (
    <div className="stack" data-testid="read-aloud">
      <div className="small">Frase {index + 1} de {items.length}. Escucha el modelo y luego léela en voz alta.</div>
      <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{item.text}</p>
      <SpeakButton text={item.text} rate={rate} label="Modelo" />
      <MicButton
        onResult={(t) => {
          setHeard(t);
        }}
        label="Leer en voz alta"
      />
      {heard !== null && acc !== null && (
        <div className="stack">
          <div className={`alert ${acc >= 0.8 ? 'good' : 'warn'}`} role="status">
            <div>
              <div>El reconocedor entendió: <em>“{heard || '(nada)'}”</em></div>
              <strong>Coincidencia: {Math.round(acc * 100)} %</strong>
              <div className="small">Aproximado: el reconocimiento de voz no evalúa sonido por sonido.</div>
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => { setHeard(null); }}>Repetir</button>
            <button
              type="button"
              className="btn primary grow"
              onClick={() => {
                const all = [...results, { id: item.id, level: item.level, credit: acc }];
                setResults(all);
                setHeard(null);
                if (index + 1 >= items.length) onDone(all);
                else setIndex(index + 1);
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
      <button type="button" className="btn ghost small" onClick={() => { onDone(results.length > 0 ? results : null); }}>
        Omitir el resto
      </button>
    </div>
  );
}

/** Escritura con revisión por reglas (sin IA). */
export function WritingBox({ prompt, minWords = 0, submitLabel = 'Revisar', onSubmit }: { prompt: string; minWords?: number; submitLabel?: string; onSubmit: (text: string, errors: DetectedError[]) => void }) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<DetectedError[] | null>(null);
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  return (
    <div className="stack">
      <p><strong>{prompt}</strong></p>
      <label htmlFor="writing" className="sr-only">Tu texto</label>
      <textarea
        id="writing"
        value={text}
        maxLength={5000}
        onChange={(e) => {
          setText(e.target.value);
          setErrors(null);
        }}
        placeholder="Write here…"
      />
      <div className="small">{words} palabras{minWords > 0 ? ` (mínimo sugerido: ${minWords})` : ''}</div>
      <button
        type="button"
        className="btn primary"
        disabled={words === 0}
        onClick={() => {
          const found = detectErrors(text);
          setErrors(found);
          onSubmit(text, found);
        }}
      >
        {submitLabel}
      </button>
      {errors !== null && <ErrorList errors={errors} />}
    </div>
  );
}

export function ErrorList({ errors }: { errors: readonly DetectedError[] }) {
  if (errors.length === 0) {
    return (
      <div className="alert info" role="status">
        No se detectaron errores típicos. Ojo: el detector solo reconoce patrones frecuentes de hispanohablantes; no es una corrección completa.
      </div>
    );
  }
  return (
    <div className="stack" role="status">
      <strong>Posibles errores ({errors.length}):</strong>
      {errors.map((e, i) => (
        <div key={`${e.tag}-${i}`} className="alert warn">
          <div>
            <strong>“{e.match}”</strong> — {e.label}
            <div>{e.explanation}</div>
            <div className="small">✗ {e.example.wrong} → ✓ {e.example.right}</div>
          </div>
        </div>
      ))}
      <p className="small">Detector por reglas: puede marcar algo correcto en contextos poco comunes.</p>
    </div>
  );
}

export function Rubric({ criteria, values, onChange }: { criteria: readonly RubricCriterion[]; values: Record<string, number>; onChange: (id: string, v: number) => void }) {
  return (
    <div className="stack">
      {criteria.map((c) => (
        <fieldset key={c.id} className="card" style={{ margin: 0 }}>
          <legend style={{ fontWeight: 700 }}>{c.label}</legend>
          <div className="options">
            {c.levels.map((desc, i) => (
              <button
                key={desc}
                type="button"
                className={`btn option ${values[c.id] === i + 1 ? 'primary' : ''}`}
                aria-pressed={values[c.id] === i + 1}
                onClick={() => {
                  onChange(c.id, i + 1);
                }}
              >
                {i + 1}. {desc}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/** Texto listo para pegar en un chat de IA gratuito (alternativa sin costo al tutor integrado). */
export function CopyPrompt({ title, text }: { title: string; text: string }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <details className="card">
      <summary style={{ fontWeight: 600, cursor: 'pointer' }}>{title}</summary>
      <p className="small">Copia este texto y pégalo en la app gratuita de Claude (u otro chat de IA). Así practicas con un tutor sin costo para esta app.</p>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', background: 'var(--surface-2)', padding: 10, borderRadius: 8 }}>{text}</pre>
      <button
        type="button"
        className="btn small"
        onClick={() => {
          navigator.clipboard
            .writeText(text)
            .then(() => {
              setStatus('Copiado.');
            })
            .catch(() => {
              setStatus('No se pudo copiar automáticamente: mantén presionado el texto para copiarlo.');
            });
        }}
      >
        Copiar
      </button>
      {status && <span className="small" role="status"> {status}</span>}
    </details>
  );
}
