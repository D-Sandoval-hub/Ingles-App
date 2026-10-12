import { useState } from 'react';
import { Link } from 'react-router';
import { db } from '../../db/db';
import { addSession } from '../../db/repo';
import { dayKey } from '../../domain/time';
import { RESOURCES } from '../../content/resources';
import { deriveToday, formatMinutes } from '../derive';
import { useAppData } from '../data';
import { BlockTimer, useBlockTimer } from '../components/Timer';
import { ResourceList } from './Block';
import { Loading } from './Loading';

/** Registro de input (listening extensivo): temporizador o minutos manuales. */
export function InputPage() {
  const data = useAppData();
  const todayKey = dayKey(new Date());
  const timer = useBlockTimer(`timer:${todayKey}:input`);
  const [resourceId, setResourceId] = useState('');
  const [manual, setManual] = useState('');
  const [comprehension, setComprehension] = useState(3);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) return <Loading />;
  const t = deriveToday({ ...data, now: new Date() });
  const planned = t?.plan.blocks.find((b) => b.module === 'input')?.minutes ?? 120;

  const save = async (seconds: number) => {
    setError(null);
    if (seconds < 60) {
      setError('Registra al menos 1 minuto.');
      return;
    }
    await addSession(db, {
      dayKey: todayKey,
      module: 'input',
      kind: 'input',
      startedAt: Date.now() - seconds * 1000,
      endedAt: Date.now(),
      seconds,
      score: null,
      comprehension,
      ...(resourceId ? { resourceId } : {}),
    });
    setMessage(`Guardado: ${formatMinutes(seconds / 60)} de input.`);
    setManual('');
  };

  const manualMinutes = Number(manual);
  const manualValid = Number.isInteger(manualMinutes) && manualMinutes >= 1 && manualMinutes <= 600;

  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Input</h1>
        <Link to="/" className="btn ghost small">Volver</Link>
      </div>
      <p className="small">Listening extensivo: podcasts y series en traslados o tareas mecánicas. Hoy llevas {formatMinutes(t?.today.inputMinutes ?? 0)} de {formatMinutes(planned)}.</p>

      <div className="card stack">
        <label htmlFor="resource">¿Qué escuchaste?</label>
        <select id="resource" value={resourceId} onChange={(e) => { setResourceId(e.target.value); }}>
          <option value="">Otro / no especificado</option>
          {RESOURCES.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <label htmlFor="comp">¿Cuánto entendiste? ({comprehension}/5)</label>
        <input id="comp" type="range" min={1} max={5} step={1} value={comprehension} onChange={(e) => { setComprehension(Number(e.target.value)); }} />
        <div className="small">1 = casi nada · 3 = la idea general · 5 = casi todo. Si marcas 1–2 seguido, baja de nivel; si marcas 5 seguido, sube.</div>
      </div>

      <BlockTimer timer={timer} plannedMinutes={planned} />
      <button type="button" className="btn primary block" disabled={timer.activeSeconds < 60} onClick={() => { void save(timer.finish()).catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Error al guardar.'); }); }}>
        Guardar tiempo del temporizador
      </button>

      <div className="card stack">
        <label htmlFor="manual">O registra minutos a mano (p. ej. si escuchaste en el metro)</label>
        <div className="row">
          <input id="manual" type="number" inputMode="numeric" min={1} max={600} value={manual} onChange={(e) => { setManual(e.target.value); }} style={{ maxWidth: 140 }} />
          <button type="button" className="btn primary" disabled={!manualValid} onClick={() => { void save(manualMinutes * 60).catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Error al guardar.'); }); }}>
            Agregar minutos
          </button>
        </div>
        {manual !== '' && !manualValid && <div className="small" role="alert">Ingresa un número entero entre 1 y 600.</div>}
      </div>
      {message && <div className="alert good" role="status">{message}</div>}
      {error && <div className="alert bad" role="alert">{error}</div>}

      <ResourceList score={t?.scores.listening ?? 30} title="Sugerencias para tu nivel" />
    </div>
  );
}
