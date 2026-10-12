import { useCallback, useEffect, useRef, useState } from 'react';
import { BREAK_MINUTES, WORK_MINUTES } from '../../domain/plan';
import { safeStorage, useNow } from '../data';

interface TimerState {
  accumulatedMs: number;
  runningSince: number | null;
}

function load(key: string): TimerState {
  const raw = safeStorage.get(key);
  if (!raw) return { accumulatedMs: 0, runningSince: null };
  try {
    const parsed = JSON.parse(raw) as Partial<TimerState>;
    return {
      accumulatedMs: typeof parsed.accumulatedMs === 'number' ? parsed.accumulatedMs : 0,
      runningSince: typeof parsed.runningSince === 'number' ? parsed.runningSince : null,
    };
  } catch {
    return { accumulatedMs: 0, runningSince: null };
  }
}

/**
 * Temporizador de bloque basado en la hora real: si Android congela la página o la recarga,
 * el tiempo no se pierde (se guarda el inicio en el almacenamiento local).
 * Mantiene la pantalla encendida mientras corre (Wake Lock), si el navegador lo permite.
 */
export function useBlockTimer(storageKey: string) {
  const [state, setState] = useState<TimerState>(() => load(storageKey));
  const now = useNow(1000);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const persist = useCallback(
    (s: TimerState) => {
      setState(s);
      safeStorage.set(storageKey, JSON.stringify(s));
    },
    [storageKey],
  );

  const running = state.runningSince !== null;
  const activeMs = state.accumulatedMs + (state.runningSince !== null ? Math.max(0, now - state.runningSince) : 0);

  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return;
    let cancelled = false;
    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          if (cancelled) void lock.release();
          else wakeLock.current = lock;
        })
        .catch(() => {
          /* sin wake lock: el temporizador igual funciona por hora real */
        });
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [running]);

  return {
    running,
    activeSeconds: Math.floor(activeMs / 1000),
    start: () => {
      if (!running) persist({ ...state, runningSince: Date.now() });
    },
    pause: () => {
      if (state.runningSince !== null) persist({ accumulatedMs: state.accumulatedMs + (Date.now() - state.runningSince), runningSince: null });
    },
    /** Detiene y devuelve los segundos activos acumulados; limpia el estado. */
    finish: (): number => {
      const total = state.accumulatedMs + (state.runningSince !== null ? Date.now() - state.runningSince : 0);
      safeStorage.remove(storageKey);
      setState({ accumulatedMs: 0, runningSince: null });
      return Math.floor(total / 1000);
    },
  };
}

export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function BlockTimer({ timer, plannedMinutes }: { timer: ReturnType<typeof useBlockTimer>; plannedMinutes: number }) {
  const secs = timer.activeSeconds;
  const cycleSecs = WORK_MINUTES * 60;
  const breakDue = secs > 0 && secs % cycleSecs < 60 && secs >= cycleSecs;
  const pct = Math.min(100, (secs / 60 / Math.max(1, plannedMinutes)) * 100);
  return (
    <div className="card stack" aria-live="polite">
      <div className="timer" data-testid="timer">{formatClock(secs)}</div>
      <div className="progress" aria-label={`Progreso del bloque: ${Math.round(pct)} %`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="small center">Meta del bloque: {plannedMinutes} min · cada {WORK_MINUTES} min, descansa {BREAK_MINUTES}</div>
      {breakDue && <div className="alert info">Llevas {Math.floor(secs / 60)} min. Pausa el temporizador y toma {BREAK_MINUTES} minutos de descanso (usa la alarma del teléfono si vas a bloquear la pantalla).</div>}
      <div className="row">
        {timer.running ? (
          <button type="button" className="btn grow" onClick={timer.pause}>Pausar</button>
        ) : (
          <button type="button" className="btn primary grow" onClick={timer.start}>{secs > 0 ? 'Reanudar' : 'Iniciar'}</button>
        )}
      </div>
    </div>
  );
}
