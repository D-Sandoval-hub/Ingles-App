import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { db } from '../../db/db';
import { addErrorEvents, ensureDeck, getSettings, uid, updateSettings } from '../../db/repo';
import {
  buildAssessmentForm,
  completeScores,
  scoreAssessment,
  suggestedStartRank,
  type AssessmentForm,
  type AssessmentKind,
  type AssessmentResponses,
} from '../../domain/assessment';
import { estimateVocabSize } from '../../domain/scoring';
import { detectErrors } from '../../domain/errors';
import { dayKey, programDay } from '../../domain/time';
import { SPEAKING_RUBRIC, VOCAB_BANDS, WRITING_RUBRIC, type Passage } from '../../content/assessment';
import { safeStorage, useAppData, type AppData } from '../data';
import { McqSeries, Dictation, ReadAloud, Rubric, ErrorList } from '../components/Exercises';
import { MicButton, SpeakButton, stopSpeaking } from '../components/Audio';
import { Loading } from './Loading';

const SECTIONS = ['intro', 'vocab', 'grammar', 'reading', 'listening', 'dictation', 'readAloud', 'speaking', 'writing'] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABEL: Record<Section, string> = {
  intro: 'Inicio',
  vocab: 'Vocabulario',
  grammar: 'Gramática',
  reading: 'Lectura',
  listening: 'Comprensión auditiva',
  dictation: 'Dictado',
  readAloud: 'Lectura en voz alta',
  speaking: 'Expresión oral',
  writing: 'Escritura',
};

interface Progress {
  kind: AssessmentKind;
  form: AssessmentForm;
  section: Section;
  responses: AssessmentResponses;
  speakingTranscript: string;
  writingText: string;
  startedAt: number;
  /** Respuestas parciales de la sección en curso (vocabulario / gramática). */
  partialVocab?: { band: string | null; saidYes: boolean }[];
  partialGrammar?: boolean[];
}

const EMPTY: AssessmentResponses = { vocab: null, grammar: null, reading: null, listening: null, readAloud: null, speakingRubric: null, writingRubric: null };

function storageKey(kind: AssessmentKind) {
  return `assessment-in-progress:${kind}`;
}

function loadProgress(kind: AssessmentKind): Progress | null {
  const raw = safeStorage.get(storageKey(kind));
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Progress;
    // Descarta tests a medias de más de 3 días.
    if (p.kind !== kind || Date.now() - p.startedAt > 3 * 86_400_000) return null;
    return p;
  } catch {
    return null;
  }
}

export function AssessmentPage() {
  const { kind } = useParams();
  if (kind !== 'diagnostic' && kind !== 'weekly') return <Navigate to="/" replace />;
  return <AssessmentRunner key={kind} kind={kind} />;
}

function AssessmentRunner({ kind }: { kind: AssessmentKind }) {
  const data = useAppData();
  if (!data) return <Loading />;
  return <AssessmentFlow kind={kind} data={data} />;
}

function newProgress(kind: AssessmentKind, data: AppData): Progress {
  const seen = new Map<string, number>();
  for (const a of data.assessments) for (const id of a.grammarSeen) seen.set(id, (seen.get(id) ?? 0) + 1);
  const form = buildAssessmentForm({ kind, previousCount: data.assessments.length, seenGrammar: seen, rand: Math.random });
  return { kind, form, section: 'intro', responses: EMPTY, speakingTranscript: '', writingText: '', startedAt: Date.now() };
}

function AssessmentFlow({ kind, data }: { kind: AssessmentKind; data: AppData }) {
  const navigate = useNavigate();
  // Retoma un test a medias (Android puede cerrar la app en segundo plano) o crea uno nuevo.
  const [p, setP] = useState<Progress>(() => loadProgress(kind) ?? newProgress(kind, data));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    safeStorage.set(storageKey(kind), JSON.stringify(p));
  }, [p, kind]);

  useEffect(() => () => { stopSpeaking(); }, []);

  const update = (patch: Partial<Progress>) => {
    setP((prev) => ({ ...prev, ...patch }));
  };
  const setResp = (patch: Partial<AssessmentResponses>, nextSection?: Section) => {
    setP((prev) => ({ ...prev, responses: { ...prev.responses, ...patch }, ...(nextSection ? { section: nextSection } : {}) }));
  };
  const idx = SECTIONS.indexOf(p.section);
  const nextOf = (s: Section): Section => SECTIONS[Math.min(SECTIONS.length - 1, SECTIONS.indexOf(s) + 1)] ?? 'writing';
  const rate = data.settings.ttsRate;

  const finish = async (final: Progress) => {
    setSaving(true);
    setError(null);
    try {
      const settings = await getSettings(db);
      const today = dayKey(new Date());
      let start = settings.startDate;
      if (!start) {
        start = today;
        await updateSettings(db, { startDate: today });
      }
      const result = scoreAssessment(final.responses);
      const prev = data.assessments.at(-1)?.completed ?? null;
      const id = uid();
      await db.assessments.add({
        id,
        kind,
        form: final.form.form,
        dayNumber: Math.max(1, programDay(start, today)),
        dayKey: today,
        takenAt: Date.now(),
        scores: result.scores,
        completed: completeScores(result.scores, prev),
        levels: result.levels,
        vocabSize: result.vocabSize,
        falseAlarmRate: result.falseAlarmRate,
        grammarSeen: final.form.grammar.map((g) => g.id),
        speakingTranscript: final.speakingTranscript.slice(0, 10_000),
        writingText: final.writingText.slice(0, 10_000),
      });
      const errs = detectErrors(`${final.writingText}\n${final.speakingTranscript}`);
      await addErrorEvents(db, errs.map((e) => ({ tag: e.tag, example: e.match, at: Date.now(), source: 'assessment' as const })));
      if (kind === 'diagnostic') {
        const perBand = final.responses.vocab ? estimateVocabSize(final.responses.vocab, VOCAB_BANDS).perBand : {};
        await ensureDeck(db, Date.now(), suggestedStartRank(perBand));
      } else {
        await ensureDeck(db, Date.now());
      }
      safeStorage.remove(storageKey(kind));
      await navigate(`/resultado/${id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el resultado.');
      setSaving(false);
    }
  };

  const skip = (field: keyof AssessmentResponses) => {
    setResp({ [field]: null }, nextOf(p.section));
  };

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>{kind === 'diagnostic' ? 'Test diagnóstico' : 'Re-evaluación'}</h1>
        <Link to="/" className="btn ghost small">Salir</Link>
      </div>
      <div className="small">Sección {idx + 1} de {SECTIONS.length}: <strong>{SECTION_LABEL[p.section]}</strong> · tu avance se guarda si sales.</div>
      <div className="progress"><span style={{ width: `${(idx / SECTIONS.length) * 100}%` }} /></div>

      {p.section === 'intro' && (
        <div className="card stack">
          <p>Responde sin diccionario ni traductor: el objetivo es saber dónde estás, no sacar buena nota. Si no sabes, elige lo que creas o marca "No la conozco".</p>
          <ul className="small">
            <li>Duración: ~{kind === 'diagnostic' ? 40 : 25} minutos. Puedes omitir secciones.</li>
            <li>Necesitas audio (voz sintética). El micrófono es opcional.</li>
            <li>El resultado es una estimación aproximada, no una certificación.</li>
          </ul>
          <button type="button" className="btn primary" onClick={() => { update({ section: 'vocab' }); }}>Comenzar</button>
        </div>
      )}

      {p.section === 'vocab' && (
        <div className="card stack">
          <VocabYesNo
            items={p.form.vocab}
            initial={p.partialVocab ?? []}
            onProgress={(a) => { update({ partialVocab: a }); }}
            onDone={(answers) => { setResp({ vocab: answers }, 'grammar'); }}
          />
          <button type="button" className="btn ghost small" onClick={() => { skip('vocab'); }}>Omitir sección</button>
        </div>
      )}

      {p.section === 'grammar' && (
        <div className="card stack">
          <p className="small">Elige la opción correcta.</p>
          <McqSeries items={p.form.grammar} feedback={false} initialCorrect={p.partialGrammar ?? []} onProgress={(c) => { update({ partialGrammar: c }); }} onDone={(r) => { setResp({ grammar: r.map((x) => ({ level: x.item.level, credit: x.correct ? 1 : 0 })) }, 'reading'); }} />
          <button type="button" className="btn ghost small" onClick={() => { skip('grammar'); }}>Omitir sección</button>
        </div>
      )}

      {p.section === 'reading' && (
        <div className="card stack">
          <PassageSeries passages={p.form.reading} mode="read" rate={rate} onDone={(r) => { setResp({ reading: r }, 'listening'); }} />
          <button type="button" className="btn ghost small" onClick={() => { skip('reading'); }}>Omitir sección</button>
        </div>
      )}

      {p.section === 'listening' && (
        <div className="card stack">
          <PassageSeries passages={p.form.listening} mode="listen" rate={rate} onDone={(r) => { setResp({ listening: r }, 'dictation'); }} />
          <button type="button" className="btn ghost small" onClick={() => { skip('listening'); }}>Omitir sección</button>
        </div>
      )}

      {p.section === 'dictation' && (
        <div className="card stack">
          <Dictation items={p.form.dictation} rate={rate} feedback={false} onDone={(r) => {
            setResp({ listening: [...(p.responses.listening ?? []), ...r.map((x) => ({ level: x.level, credit: x.credit }))] }, 'readAloud');
          }} />
          <button type="button" className="btn ghost small" onClick={() => { update({ section: 'readAloud' }); }}>Omitir sección</button>
        </div>
      )}

      {p.section === 'readAloud' && (
        <div className="card stack">
          <ReadAloud items={p.form.readAloud} rate={rate} onDone={(r) => { setResp({ readAloud: r ? r.map((x) => ({ level: x.level, credit: x.credit })) : null }, 'speaking'); }} />
        </div>
      )}

      {p.section === 'speaking' && (
        <SpeakingSection
          prompt={p.form.speakingPrompt}
          transcript={p.speakingTranscript}
          onTranscript={(t) => { update({ speakingTranscript: t }); }}
          onDone={(ratings) => { setResp({ speakingRubric: ratings }, 'writing'); }}
        />
      )}

      {p.section === 'writing' && (
        <WritingSection
          prompt={p.form.writingPrompt}
          text={p.writingText}
          onText={(t) => { update({ writingText: t }); }}
          disabled={saving}
          onDone={(ratings) => {
            const final = { ...p, responses: { ...p.responses, writingRubric: ratings } };
            setP(final);
            void finish(final);
          }}
        />
      )}

      {error && <div className="alert bad" role="alert">{error}</div>}
    </div>
  );
}

type YesNo = { band: string | null; saidYes: boolean };

function VocabYesNo({ items, initial, onProgress, onDone }: { items: AssessmentForm['vocab']; initial: YesNo[]; onProgress: (a: YesNo[]) => void; onDone: (a: YesNo[]) => void }) {
  const [i, setI] = useState(Math.min(initial.length, Math.max(0, items.length - 1)));
  const [answers, setAnswers] = useState<YesNo[]>(() => initial.slice(0, items.length));
  const item = items[i];
  if (!item) return null;
  const answer = (yes: boolean) => {
    const next = [...answers, { band: item.band, saidYes: yes }];
    setAnswers(next);
    onProgress(next);
    if (i + 1 >= items.length) onDone(next);
    else setI(i + 1);
  };
  return (
    <div className="stack" data-testid="vocab-test">
      <p className="small">¿Conoces el significado de esta palabra? Algunas no existen: si dices que sí a esas, baja tu puntaje. ({i + 1}/{items.length})</p>
      <div className="flash" style={{ minHeight: 120 }}><div className="word" lang="en">{item.word}</div></div>
      <div className="row">
        <button type="button" className="btn grow" onClick={() => { answer(false); }}>No la conozco</button>
        <button type="button" className="btn primary grow" onClick={() => { answer(true); }}>La conozco</button>
      </div>
    </div>
  );
}

function PassageSeries({ passages, mode, rate, onDone }: { passages: readonly Passage[]; mode: 'read' | 'listen'; rate: number; onDone: (r: { level: Passage['level']; credit: number }[]) => void }) {
  const [i, setI] = useState(0);
  const [plays, setPlays] = useState(0);
  const [results, setResults] = useState<{ level: Passage['level']; credit: number }[]>([]);
  const passage = passages[i];
  if (!passage) return null;
  return (
    <div className="stack">
      <div className="small">Texto {i + 1} de {passages.length} · {mode === 'listen' ? 'escucha (máx. 2 veces) y responde' : 'lee y responde'}</div>
      <h3>{passage.title}</h3>
      {mode === 'read' ? (
        <p lang="en">{passage.text}</p>
      ) : (
        <div className="row">
          {plays < 2 ? (
            <span onClickCapture={() => { setPlays((n) => n + 1); }}>
              <SpeakButton text={passage.text} rate={rate} label={plays === 0 ? 'Reproducir' : 'Reproducir otra vez'} small={false} />
            </span>
          ) : (
            <span className="small">Ya escuchaste el audio 2 veces.</span>
          )}
        </div>
      )}
      <McqSeries
        key={passage.id}
        items={passage.questions.map((q, k) => ({ id: `${passage.id}-${k}`, prompt: q.q, options: q.options, answer: q.answer }))}
        feedback={false}
        onDone={(r) => {
          const all = [...results, ...r.map((x) => ({ level: passage.level, credit: x.correct ? 1 : 0 }))];
          setResults(all);
          setPlays(0);
          stopSpeaking();
          if (i + 1 >= passages.length) onDone(all);
          else setI(i + 1);
        }}
      />
    </div>
  );
}

function useRubric(criteria: readonly { id: string }[]) {
  const [values, setValues] = useState<Record<string, number>>({});
  const complete = criteria.every((c) => typeof values[c.id] === 'number');
  return {
    values,
    complete,
    set: (id: string, v: number) => { setValues((prev) => ({ ...prev, [id]: v })); },
    list: () => criteria.map((c) => values[c.id] ?? 1),
  };
}

function SpeakingSection({ prompt, transcript, onTranscript, onDone }: { prompt: string; transcript: string; onTranscript: (t: string) => void; onDone: (r: number[] | null) => void }) {
  const rubric = useRubric(SPEAKING_RUBRIC);
  return (
    <div className="card stack">
      <p>Habla durante ~1 minuto, en voz alta:</p>
      <p lang="en"><strong>{prompt}</strong></p>
      <MicButton continuous label="Grabar (opcional)" onResult={(t) => { onTranscript(t); }} />
      {transcript && <p className="small">Transcripción: <em lang="en">{transcript}</em></p>}
      <p>Ahora evalúate con honestidad (elige el nivel que mejor te describe):</p>
      <Rubric criteria={SPEAKING_RUBRIC} values={rubric.values} onChange={rubric.set} />
      <button type="button" className="btn primary" disabled={!rubric.complete} onClick={() => { onDone(rubric.list()); }}>Continuar</button>
      <button type="button" className="btn ghost small" onClick={() => { onDone(null); }}>Omitir sección</button>
    </div>
  );
}

function WritingSection({ prompt, text, onText, onDone, disabled }: { prompt: string; text: string; onText: (t: string) => void; onDone: (r: number[] | null) => void; disabled: boolean }) {
  const rubric = useRubric(WRITING_RUBRIC);
  const [checked, setChecked] = useState(false);
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  return (
    <div className="card stack">
      <p lang="en"><strong>{prompt}</strong></p>
      <label htmlFor="assess-writing" className="sr-only">Tu texto</label>
      <textarea id="assess-writing" value={text} maxLength={5000} onChange={(e) => { onText(e.target.value); setChecked(false); }} placeholder="Write here…" />
      <div className="small">{words} palabras</div>
      <button type="button" className="btn" disabled={words === 0} onClick={() => { setChecked(true); }}>Ver errores típicos detectados</button>
      {checked && <ErrorList errors={detectErrors(text)} />}
      <p>Evalúa tu texto:</p>
      <Rubric criteria={WRITING_RUBRIC} values={rubric.values} onChange={rubric.set} />
      <button type="button" className="btn primary" disabled={!rubric.complete || disabled} onClick={() => { onDone(rubric.list()); }} data-testid="finish-assessment">
        Terminar y ver resultado
      </button>
      <button type="button" className="btn ghost small" disabled={disabled} onClick={() => { onDone(null); }}>Omitir sección y terminar</button>
    </div>
  );
}
