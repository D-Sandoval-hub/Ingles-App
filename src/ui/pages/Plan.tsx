import { Navigate } from 'react-router';
import { generatePlanDay, isLightDay, isScheduledAssessmentDay, MINIMUM_DAY_MINUTES, plannedMinutes } from '../../domain/plan';
import { addDays } from '../../domain/time';
import { MODULE_LABELS } from '../../domain/types';
import { deriveToday, formatMinutes } from '../derive';
import { useAppData } from '../data';
import { Loading } from './Loading';

export function PlanPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  if (!data.settings.startDate) return <Navigate to="/bienvenida" replace />;
  const t = deriveToday({ ...data, now: new Date() });
  if (!t) return <Loading />;
  const start = data.settings.startDate;
  const horizon = Math.max(30, t.dayNumber);
  const preview = generatePlanDay({ dayNumber: Math.max(t.dayNumber + 1, 2), scores: t.scores, assessmentDue: false });

  return (
    <div className="stack">
      <h1>Plan de {horizon} días</h1>
      <div className="legend small">
        <span><i style={{ background: 'var(--good-bg)' }} />cumplido (≥ 2 h)</span>
        <span><i style={{ background: 'var(--bad-bg)' }} />bajo el mínimo</span>
        <span>L = liviano · E = evaluación</span>
      </div>
      <div className="plan-grid">
        {Array.from({ length: horizon }, (_, i) => i + 1).map((n) => {
          const key = addDays(start, n - 1);
          const tot = t.totals.get(key);
          const minutes = tot ? tot.activeMinutes + tot.inputMinutes : 0;
          const past = n < t.dayNumber;
          const cls = ['plan-day', n === t.dayNumber ? 'today' : '', past && minutes >= MINIMUM_DAY_MINUTES ? 'done' : '', past && minutes < MINIMUM_DAY_MINUTES ? 'missed' : ''].join(' ');
          return (
            <div key={n} className={cls} title={`Día ${n}: ${formatMinutes(minutes)}`}>
              <div className="n">{n}</div>
              <div>{isLightDay(n) ? 'L' : ''}{isScheduledAssessmentDay(n) ? 'E' : ''}</div>
              {(past || n === t.dayNumber) && <div>{Math.round(minutes / 60)}h</div>}
            </div>
          );
        })}
      </div>
      <div className="card">
        <h2>Próximo día completo (según tu rendimiento actual)</h2>
        <p className="small">El reparto cambia solo: la habilidad más atrasada recibe hasta un 20 % más de tiempo.</p>
        <table className="data">
          <thead><tr><th>Bloque</th><th className="num">Minutos</th></tr></thead>
          <tbody>
            {preview.blocks.map((b) => (
              <tr key={b.id}><td>{MODULE_LABELS[b.module]}</td><td className="num">{b.minutes}</td></tr>
            ))}
            <tr><td><strong>Activo</strong></td><td className="num"><strong>{plannedMinutes(preview, 'active')}</strong></td></tr>
            <tr><td><strong>Input</strong></td><td className="num"><strong>{plannedMinutes(preview, 'input')}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div className="card small">
        <p><strong>Si fallas un día:</strong> no se acumula deuda. El contenido avanza por días estudiados (no por calendario), y si hay muchas tarjetas vencidas la app reduce las nuevas.</p>
        <p><strong>Días livianos</strong> cada 7 días; <strong>re-evaluaciones</strong> los días 7, 14, 21 y 30 (si pierdes una, queda pendiente).</p>
      </div>
    </div>
  );
}
