import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { db } from '../../db/db';
import { ensureDeck, updateSettings } from '../../db/repo';
import { dayKey } from '../../domain/time';

export function WelcomePage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWithoutTest = async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureDeck(db, Date.now());
      await updateSettings(db, { startDate: dayKey(new Date()) });
      await navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar en el teléfono.');
      setBusy(false);
    }
  };

  return (
    <div className="stack section">
      <h1>Bienvenido</h1>
      <div className="card stack">
        <p>Esta app organiza tu día de estudio en bloques (repetición espaciada, listening, pronunciación, conversación, gramática y escritura) más horas de input, y se adapta a tu rendimiento.</p>
        <p><strong>Funciona sin conexión</strong> y es gratuita: tus datos se guardan solo en este teléfono. Haz un respaldo de vez en cuando (Más → Ajustes).</p>
        <div className="alert info small">
          <div>
            <strong>Expectativa realista:</strong> con estudio constante, pasar de A2 a B1 en 30 días es posible; B2 en ese plazo es poco probable. El test de esta app estima tu nivel, pero no es una certificación oficial.
          </div>
        </div>
      </div>
      <div className="card stack">
        <h2>Primer paso: test de nivel</h2>
        <p>~40 minutos: vocabulario, gramática, lectura, listening, expresión oral y escritura. Puedes omitir secciones.</p>
        <Link className="btn primary block" to="/test/diagnostic">Hacer el test diagnóstico</Link>
        <button type="button" className="btn ghost block" disabled={busy} onClick={() => { void startWithoutTest(); }}>
          Empezar sin test (lo puedes hacer después)
        </button>
        {error && <div className="alert bad" role="alert">{error}</div>}
      </div>
    </div>
  );
}
