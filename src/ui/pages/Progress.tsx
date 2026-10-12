import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { topErrors } from '../../domain/errors';
import { addDays, parseDayKey } from '../../domain/time';
import { scoreToCefr } from '../../domain/scoring';
import { SKILLS, SKILL_LABELS } from '../../domain/types';
import { deriveToday, formatHours, formatMinutes } from '../derive';
import { useAppData } from '../data';
import { Loading } from './Loading';

const WEEKDAY = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function ProgressPage() {
  const data = useAppData();
  const [selected, setSelected] = useState<string | null>(null);
  if (!data) return <Loading />;
  if (!data.settings.startDate) return <Navigate to="/bienvenida" replace />;
  const t = deriveToday({ ...data, now: new Date() });
  if (!t) return <Loading />;

  const days = Array.from({ length: 7 }, (_, i) => addDays(t.todayKey, i - 6));
  const rows = days.map((d) => t.totals.get(d) ?? { dayKey: d, activeMinutes: 0, inputMinutes: 0, performance: null });
  const week = rows.reduce((acc, r) => ({ active: acc.active + r.activeMinutes, input: acc.input + r.inputMinutes }), { active: 0, input: 0 });
  const allTotals = [...t.totals.values()].reduce((acc, r) => ({ active: acc.active + r.activeMinutes, input: acc.input + r.inputMinutes }), { active: 0, input: 0 });
  const maxMin = Math.max(60, ...rows.map((r) => r.activeMinutes + r.inputMinutes));
  const first = data.assessments[0];
  const last = data.assessments.at(-1);
  const errors = topErrors(data.errorEvents.map((e) => e.tag));
  const sel = rows.find((r) => r.dayKey === selected);

  return (
    <div className="stack">
      <h1>Progreso</h1>
      {t.alerts.map((a) => <div key={a.kind} className={`alert ${a.kind === 'overload' ? 'bad' : 'warn'}`} role="alert">{a.message}</div>)}

      <div className="tiles">
        <div className="tile"><div className="value">{t.streak}</div><div className="label">días de racha (≥ 2 h)</div></div>
        <div className="tile"><div className="value" data-testid="mastered">{data.cardStats.mastered}</div><div className="label">palabras dominadas</div></div>
        <div className="tile"><div className="value">{formatHours(allTotals.active)}</div><div className="label">horas activas (total)</div></div>
        <div className="tile"><div className="value">{formatHours(allTotals.input)}</div><div className="label">horas de input (total)</div></div>
      </div>

      <div className="card">
        <h2>Últimos 7 días</h2>
        <div className="legend">
          <span><i style={{ background: 'var(--series-active)' }} />Activo {formatHours(week.active)}</span>
          <span><i style={{ background: 'var(--series-input)' }} />Input {formatHours(week.input)}</span>
        </div>
        <div className="daychart" role="img" aria-label="Minutos por día, activo e input, últimos 7 días">
          {rows.map((r) => {
            const a = (r.activeMinutes / maxMin) * 100;
            const i = (r.inputMinutes / maxMin) * 100;
            return (
              <button
                key={r.dayKey}
                type="button"
                className="col"
                aria-label={`${r.dayKey}: ${formatMinutes(r.activeMinutes)} activo, ${formatMinutes(r.inputMinutes)} input`}
                onClick={() => { setSelected(r.dayKey === selected ? null : r.dayKey); }}
              >
                {i > 0 && <span className={`seg input`} style={{ height: `${i}%` }} />}
                {a > 0 && <span className={`seg active ${i > 0 ? '' : 'only'}`} style={{ height: `${a}%`, borderRadius: i > 0 ? '0 0 4px 4px' : '4px' }} />}
              </button>
            );
          })}
        </div>
        <div className="daychart-labels">{rows.map((r) => <span key={r.dayKey}>{WEEKDAY[parseDayKey(r.dayKey).getDay()]}</span>)}</div>
        {sel ? (
          <p className="small" role="status">{sel.dayKey}: {formatMinutes(sel.activeMinutes)} activo · {formatMinutes(sel.inputMinutes)} input{sel.performance !== null ? ` · rendimiento ${sel.performance} %` : ''}</p>
        ) : (
          <p className="small muted">Toca una barra para ver el detalle.</p>
        )}
        <details>
          <summary className="small">Ver como tabla</summary>
          <table className="data">
            <thead><tr><th>Día</th><th className="num">Activo</th><th className="num">Input</th><th className="num">Rend.</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.dayKey}><td>{r.dayKey}</td><td className="num">{r.activeMinutes}</td><td className="num">{r.inputMinutes}</td><td className="num">{r.performance ?? '—'}</td></tr>)}</tbody>
          </table>
        </details>
      </div>

      <div className="card">
        <h2>Puntaje por habilidad</h2>
        {!last && <p className="small">Aún no hay evaluaciones. <Link to="/test/diagnostic">Hacer el test</Link></p>}
        <p className="small">Base: última evaluación, ajustada por tus ejercicios de los últimos 7 días (±10). Escala 0–100: cada 20 puntos ≈ un nivel MCER. Estimación aproximada.</p>
        {SKILLS.map((s) => {
          const v = t.scores[s];
          return (
            <div key={s} className="skillbar">
              <span>{SKILL_LABELS[s]}</span>
              <span className="track"><span className="fill" style={{ width: `${v}%` }} /></span>
              <span className="val">{Math.round(v)} {scoreToCefr(v)}</span>
            </div>
          );
        })}
        {first && last && first.id !== last.id && (
          <table className="data" style={{ marginTop: 12 }}>
            <thead><tr><th>Habilidad</th><th className="num">Inicio</th><th className="num">Última</th><th className="num">Cambio</th></tr></thead>
            <tbody>
              {SKILLS.map((s) => {
                const d = last.completed[s] - first.completed[s];
                return <tr key={s}><td>{SKILL_LABELS[s]}</td><td className="num">{Math.round(first.completed[s])}</td><td className="num">{Math.round(last.completed[s])}</td><td className="num">{d >= 0 ? '+' : ''}{Math.round(d)}</td></tr>;
              })}
            </tbody>
          </table>
        )}
        {data.assessments.length > 0 && (
          <details>
            <summary className="small">Historial de evaluaciones ({data.assessments.length})</summary>
            <ul className="small">
              {data.assessments.map((a) => <li key={a.id}><Link to={`/resultado/${a.id}`}>Día {a.dayNumber} · {a.kind === 'diagnostic' ? 'diagnóstico' : 're-evaluación'} · {a.dayKey}</Link></li>)}
            </ul>
          </details>
        )}
      </div>

      <div className="card">
        <h2>Errores recurrentes</h2>
        {errors.length === 0 ? <p className="small">Aún no hay errores registrados (se registran en gramática, escritura y conversación).</p> : (
          <table className="data">
            <tbody>{errors.map((e) => <tr key={e.tag}><td>{e.label}</td><td className="num">{e.count}×</td></tr>)}</tbody>
          </table>
        )}
      </div>

      <div className="card small">
        <strong>Tarjetas:</strong> {data.cardStats.total} en total · {data.cardStats.learning} en estudio · {data.cardStats.known} marcadas como conocidas · {data.cardStats.fresh} sin ver.
      </div>
    </div>
  );
}
