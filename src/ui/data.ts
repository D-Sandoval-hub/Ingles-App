import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, type DayChoice, type ErrorEvent, type Settings, type StoredAssessment, type StudySession } from '../db/db';
import { getSettings } from '../db/repo';
import { isMastered, State } from '../domain/srs';

export interface CardStats {
  total: number;
  known: number;
  mastered: number;
  learning: number;
  due: number;
  fresh: number;
}

export interface AppData {
  settings: Settings;
  sessions: StudySession[];
  assessments: StoredAssessment[];
  dayChoices: DayChoice[];
  errorEvents: ErrorEvent[];
  cardStats: CardStats;
}

/** Todos los datos que necesitan las pantallas, reactivos a cambios en IndexedDB. */
export function useAppData(): AppData | undefined {
  const [settingsReady, setSettingsReady] = useState(false);
  useEffect(() => {
    void getSettings(db).then(() => {
      setSettingsReady(true);
    });
  }, []);
  return useLiveQuery(async () => {
    if (!settingsReady) return undefined;
    const now = Date.now();
    const [settings, sessions, assessments, dayChoices, errorEvents, cards] = await Promise.all([
      db.settings.get('main'),
      db.sessions.toArray(),
      db.assessments.orderBy('takenAt').toArray(),
      db.dayChoices.toArray(),
      db.errorEvents.toArray(),
      db.cards.toArray(),
    ]);
    if (!settings) return undefined;
    const stats: CardStats = { total: cards.length, known: 0, mastered: 0, learning: 0, due: 0, fresh: 0 };
    for (const c of cards) {
      if (c.known === 1) stats.known++;
      if (isMastered(c)) stats.mastered++;
      if (c.known === 1) continue;
      if (c.state === State.New) stats.fresh++;
      else {
        stats.learning++;
        if (c.due <= now) stats.due++;
      }
    }
    return { settings, sessions, assessments, dayChoices, errorEvents, cardStats: stats };
  }, [settingsReady]);
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => {
      setOnline(true);
    };
    const off = () => {
      setOnline(false);
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Reloj que se actualiza cada `ms` (para temporizadores y "hoy"). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, ms);
    return () => {
      window.clearInterval(id);
    };
  }, [ms]);
  return now;
}

/** localStorage envuelto: puede fallar en modo privado o con almacenamiento bloqueado. */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* sin almacenamiento: se pierde solo la comodidad */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* idem */
    }
  },
};
