import { Link, Navigate } from 'react-router';
import { db } from '../../db/db';
import { MODULE_LABELS } from '../../domain/types';
import { plannedMinutes, wallClockMinutes } from '../../domain/plan';
import { objectivesFor } from '../../content/curriculum';
import { deriveToday, formatMinutes } from '../derive';
import { useAppData } from '../data';
import { Loading } from './Loading';

const DAY_TYPE_LABEL = { full: 'Día completo', light: 'Día liviano (repaso)', minimum: 'Día mínimo (2 h)' } as const;

export function TodayPage() {
  const data = useAppData();
  if (!data) return <Loading />;
  if (!data.settings.startDate) return <Navigate to="/bienvenida" replace />;
  const t = deriveToday({ ...data, now: new Date() });
  if (!t) return <Loading />;

  const activePlanned = plannedMinutes(t.plan, 'active');
  const inputPlanned = plannedMinutes(t.plan, 'input');

  const toggleMinimum = async () => {
    if (t.isMinimum) await db.dayChoices.delete(t.todayKey);
    else await db.dayChoices.put({ dayKey: t.todayKey, type: 'minimum' });
  };

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1 style={{ marginBottom: 2 }}>Día {t.dayNumber}{t.dayNumber > 30 ? ' · continuación' : ' de 30'}</h1>
          <span className="badge">{DAY_TYPE_LABEL[t.plan.type]}</span> <span className="badge">Nivel estimado {t.overallLevel}</span>
        </div>
        <div className="center">
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }} data-testid="streak">{t.streak}</div>
          <div className="small">días de racha</div>
        </div>
      </div>

      {t.alerts.map((a) => (
        <div key={a.kind} className={`alert ${a.kind === 'overload' ? 'bad' : 'warn'}`} role="alert">{a.message}</div>
      ))}

      {t.plan.assessmentDue && (
        <div className="alert info">
          <div>
            <strong>Re-evaluación pendiente.</strong> Mide tu avance por habilidad (~25 min).{' '}
            <Link to="/test/weekly">Hacerla ahora</Link>
          </div>
        </div>
      )}

      <div className="tiles">
        <div className="tile">
          <div className="value" data-testid="active-today">{formatMinutes(t.today.activeMinutes)}</div>
          <div className="label">activo de {formatMinutes(activePlanned)}</div>
        </div>
        <div className="tile">
          <div className="value" data-testid="input-today">{formatMinutes(t.today.inputMinutes)}</div>
          <div className="label">input de {formatMinutes(inputPlanned)}</div>
        </div>
      </div>

      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Bloques de hoy</h2>
          <span className="small">≈ {formatMinutes(wallClockMinutes(activePlanned))} con descansos</span>
        </div>
        <div>
          {t.plan.blocks.map((b) => {
            const done = Math.round(t.doneByModule[b.module] ?? 0);
            const complete = done >= b.minutes;
            const to = b.module === 'srs' ? '/repaso' : b.module === 'input' ? '/input' : b.module === 'assessment' ? '/test/weekly' : `/bloque/${b.module}`;
            const objectives = objectivesFor(b.module, t.studyWeek);
            return (
              <div className="block-item" key={b.id} data-testid={`block-${b.module}`}>
                <div className="info">
                  <div className="name">
                    {complete && <span className="done-check" aria-label="completado">✓ </span>}
                    {MODULE_LABELS[b.module]}
                  </div>
                  <div className="small">
                    {done} / {b.minutes} min{b.sessions > 1 ? ` · en ${b.sessions} sesiones` : ''}
                  </div>
                  {objectives[0] && <div className="small muted">{objectives[0]}</div>}
                </div>
                <Link className={`btn small ${complete ? '' : 'primary'}`} to={to}>
                  {complete ? 'Más' : 'Ir'}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card stack">
        <div className="row between">
          <div>
            <strong>Repetición espaciada</strong>
            <div className="small">{data.cardStats.due} vencidas · {data.cardStats.fresh} nuevas disponibles</div>
          </div>
          <Link className="btn small" to="/repaso">Repasar</Link>
        </div>
        <Link className="btn block" to="/practica">Práctica libre (5–15 min)</Link>
        <button type="button" className="btn ghost block" onClick={() => { void toggleMinimum(); }} data-testid="toggle-minimum">
          {t.isMinimum ? 'Volver al plan normal' : 'Hoy es un día pesado → día mínimo (2 h)'}
        </button>
      </div>
    </div>
  );
}
