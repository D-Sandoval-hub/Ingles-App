import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router';
import { db } from '../../db/db';
import { SKILLS, SKILL_LABELS } from '../../domain/types';
import { overallScore, scoreToCefr } from '../../domain/scoring';
import { Loading } from './Loading';

export function ResultPage() {
  const { id } = useParams();
  const result = useLiveQuery(async () => {
    if (!id) return null;
    const a = await db.assessments.get(id);
    if (!a) return null;
    const all = await db.assessments.orderBy('takenAt').toArray();
    const prev = all.filter((x) => x.takenAt < a.takenAt).at(-1) ?? null;
    return { a, prev };
  }, [id]);
  if (result === undefined) return <Loading />;
  if (result === null) return <p>No se encontró la evaluación. <Link to="/">Volver</Link></p>;
  const { a, prev } = result;
  const overall = overallScore(a.completed);

  return (
    <div className="stack">
      <h1>Resultado</h1>
      <div className="card center">
        <div className="small">Nivel general estimado</div>
        <div style={{ fontSize: '2.4rem', fontWeight: 800 }} data-testid="overall-level">{scoreToCefr(overall)}</div>
        <div className="small">{Math.round(overall)}/100 · día {a.dayNumber}</div>
      </div>
      <div className="card">
        <h2>Por habilidad</h2>
        {SKILLS.map((s) => {
          const v = a.scores[s];
          const before = prev?.completed[s];
          return (
            <div key={s} className="skillbar">
              <span>{SKILL_LABELS[s]}</span>
              <span className="track"><span className="fill" style={{ width: `${v ?? 0}%` }} /></span>
              <span className="val">{v === null ? 'omitida' : `${Math.round(v)} ${a.levels[s] ?? ''}`}</span>
              {before !== undefined && v !== null && <span className="small" style={{ gridColumn: '2 / 4' }}>antes: {Math.round(before)} ({v - before >= 0 ? '+' : ''}{Math.round(v - before)})</span>}
            </div>
          );
        })}
        {a.vocabSize !== null && <p className="small">Vocabulario estimado: ~{a.vocabSize.toLocaleString('es-CL')} palabras.</p>}
        {a.falseAlarmRate !== null && a.falseAlarmRate > 0.25 && (
          <div className="alert warn small">Dijiste conocer {Math.round(a.falseAlarmRate * 100)} % de las palabras inventadas: el puntaje de vocabulario es poco confiable. En la próxima, marca solo las que realmente conoces.</div>
        )}
      </div>
      <div className="alert info small">
        <div>
          <strong>Cómo leer esto:</strong> estimación aproximada. Expresión oral y escritura se basan sobre todo en tu autoevaluación (la evaluación con IA no está activa porque es de pago). La comprensión auditiva usa voz sintética, más clara que el habla real, así que puede salir optimista.
        </div>
      </div>
      <Link className="btn primary block" to="/">Ir a mi plan de hoy</Link>
    </div>
  );
}
