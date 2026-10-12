import { useEffect, useState } from 'react';
import { db } from '../../db/db';
import { updateSettings } from '../../db/repo';
import { BackupError, exportBackup, importBackup, MAX_BACKUP_BYTES, parseBackup } from '../../db/backup';
import { ttsSupported } from '../../speech/tts';
import { sttSupported } from '../../speech/stt';
import { useAppData } from '../data';
import { SpeakButton } from '../components/Audio';
import { Loading } from './Loading';

export function SettingsPage() {
  const data = useAppData();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      void navigator.storage.persisted().then(setPersisted).catch(() => { setPersisted(null); });
    }
  }, []);

  if (!data) return <Loading />;
  const s = data.settings;

  const download = async () => {
    const backup = await exportBackup(db);
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingles-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
    setMessage({ kind: 'good', text: 'Respaldo descargado. Guárdalo en Google Drive o envíatelo por correo.' });
  };

  const upload = async (file: File) => {
    setMessage(null);
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage({ kind: 'bad', text: 'El archivo es demasiado grande.' });
      return;
    }
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm(`Esto reemplazará TODOS tus datos actuales por el respaldo del ${new Date(backup.exportedAt).toLocaleString()}. ¿Continuar?`)) return;
      await importBackup(db, backup);
      setMessage({ kind: 'good', text: 'Respaldo restaurado.' });
    } catch (e) {
      setMessage({ kind: 'bad', text: e instanceof BackupError ? e.message : 'No se pudo restaurar el respaldo.' });
    }
  };

  const resetAll = async () => {
    if (!window.confirm('¿Borrar todos tus datos de este teléfono? No se puede deshacer (salvo que tengas un respaldo).')) return;
    await db.delete();
    // Vuelve al inicio (bienvenida) con la base recién creada.
    window.location.hash = '#/';
    window.location.reload();
  };

  return (
    <div className="stack">
      <h1>Ajustes</h1>

      <div className="card stack">
        <h2>Repetición espaciada (FSRS)</h2>
        <label htmlFor="newPerDay">Tarjetas nuevas por día: {s.srs.newPerDay}</label>
        <input id="newPerDay" type="range" min={5} max={60} step={5} value={s.srs.newPerDay} onChange={(e) => { void updateSettings(db, { srs: { ...s.srs, newPerDay: Number(e.target.value) } }); }} />
        <p className="small">Con ~45 min diarios, 20–30 nuevas al día suele ser sostenible. Cada tarjeta nueva genera repasos durante semanas.</p>
        <label htmlFor="retention">Retención objetivo: {Math.round(s.srs.retention * 100)} %</label>
        <input id="retention" type="range" min={0.8} max={0.95} step={0.01} value={s.srs.retention} onChange={(e) => { void updateSettings(db, { srs: { ...s.srs, retention: Number(e.target.value) } }); }} />
        <p className="small">Más alto = recuerdas más, pero con más repasos diarios. 90 % es un buen equilibrio.</p>
      </div>

      <div className="card stack">
        <h2>Voz</h2>
        <label htmlFor="rate">Velocidad de la voz: {s.ttsRate.toFixed(2)}×</label>
        <input id="rate" type="range" min={0.5} max={1.5} step={0.05} value={s.ttsRate} onChange={(e) => { void updateSettings(db, { ttsRate: Number(e.target.value) }); }} />
        <SpeakButton text="Hi! This is how I sound. Is this speed okay for you?" rate={s.ttsRate} label="Probar" />
        <ul className="small">
          <li>Voz sintética: {ttsSupported() ? 'disponible' : 'NO disponible'}. Para usarla sin conexión en Android, descarga la voz en inglés en Ajustes → Accesibilidad / Texto a voz.</li>
          <li>Reconocimiento de voz: {sttSupported() ? 'disponible' : 'NO disponible en este navegador'}. En Chrome normalmente necesita internet (procesa el audio en servidores de Google).</li>
          <li>Acento principal: inglés de EE. UU.</li>
        </ul>
      </div>

      <div className="card stack">
        <h2>Tus datos</h2>
        <p className="small">Se guardan solo en este teléfono (no hay servidor ni cuenta). Si borras los datos del navegador o desinstalas la app, se pierden: <strong>descarga un respaldo cada semana</strong>. También sirve para pasar tus datos al PC.</p>
        <p className="small">Almacenamiento persistente: {persisted === null ? 'desconocido' : persisted ? 'sí (el navegador no lo borrará por falta de espacio)' : 'no concedido (instala la app en la pantalla de inicio para mejorar esto)'}.</p>
        <button type="button" className="btn primary" onClick={() => { void download(); }}>Descargar respaldo</button>
        <label htmlFor="restore" className="btn">Restaurar desde archivo…</label>
        <input id="restore" type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
        {message && <div className={`alert ${message.kind}`} role="status">{message.text}</div>}
        <button type="button" className="btn ghost" onClick={() => { void resetAll(); }}>Borrar todos los datos</button>
      </div>

      <div className="card small">
        <h2>Créditos y licencias</h2>
        <ul>
          <li>Vocabulario: <a href="https://www.newgeneralservicelist.com/" target="_blank" rel="noopener noreferrer">New General Service List 1.2</a> (Browne, Culligan &amp; Phillips), licencia CC BY-SA 4.0.</li>
          <li>Traducciones, ejemplos e ítems de evaluación: escritos para esta app; pueden contener errores (marcados “a verificar”).</li>
          <li>Algoritmo de repaso: FSRS vía <code>ts-fsrs</code> (MIT). Otras librerías: React, React Router, Zod (MIT); Dexie (Apache-2.0).</li>
          <li>El puntaje de nivel es una estimación interna, no una certificación.</li>
        </ul>
      </div>
    </div>
  );
}
