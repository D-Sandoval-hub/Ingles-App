import { describe, expect, it } from 'vitest';
import { deriveToday, formatHours, formatMinutes } from './derive';
import type { Settings, StoredAssessment, StudySession } from '../db/db';
import { DEFAULT_SRS_SETTINGS } from '../domain/srs';

const settings: Settings = { id: 'main', startDate: '2026-10-01', srs: DEFAULT_SRS_SETTINGS, ttsRate: 0.9, accent: 'en-US', createdAt: 0 };
const session = (dayKey: string, minutes: number, module: StudySession['module'] = 'listening', kind: StudySession['kind'] = 'active'): StudySession => ({
  id: `${dayKey}-${module}-${minutes}`, dayKey, module, kind, startedAt: 0, endedAt: 0, seconds: minutes * 60, score: null,
});

describe('deriveToday', () => {
  it('sin fecha de inicio devuelve null', () => {
    expect(deriveToday({ settings: { ...settings, startDate: null }, sessions: [], assessments: [], dayChoices: [], now: new Date() })).toBeNull();
  });

  it('calcula día del programa, plan y minutos hechos', () => {
    const now = new Date(2026, 9, 3, 12);
    const s = deriveToday({ settings, sessions: [session('2026-10-03', 30), session('2026-10-03', 60, 'input', 'input')], assessments: [], dayChoices: [], now });
    expect(s?.dayNumber).toBe(3);
    expect(s?.plan.type).toBe('full');
    expect(s?.doneByModule.listening).toBe(30);
    expect(s?.today.inputMinutes).toBe(60);
  });

  it('día 7 sin re-evaluación: liviano con evaluación; el día mínimo elegido manda', () => {
    const now = new Date(2026, 9, 7, 12);
    const s = deriveToday({ settings, sessions: [], assessments: [], dayChoices: [], now });
    expect(s?.plan.type).toBe('light');
    expect(s?.plan.assessmentDue).toBe(true);
    const m = deriveToday({ settings, sessions: [], assessments: [], dayChoices: [{ dayKey: '2026-10-07', type: 'minimum' }], now });
    expect(m?.plan.type).toBe('minimum');
  });

  it('una re-evaluación hecha el día 8 cancela la pendiente', () => {
    const a: StoredAssessment = {
      id: 'a', kind: 'weekly', form: 2, dayNumber: 8, dayKey: '2026-10-08', takenAt: 1,
      scores: { vocab: 50, grammar: 50, reading: 50, listening: 50, speaking: 50, writing: 50 },
      completed: { vocab: 50, grammar: 50, reading: 50, listening: 50, speaking: 50, writing: 50 },
      levels: { vocab: 'A2', grammar: 'A2', reading: 'A2', listening: 'A2', speaking: 'A2', writing: 'A2' },
      vocabSize: 2000, falseAlarmRate: 0, grammarSeen: [], speakingTranscript: '', writingText: '',
    };
    const s = deriveToday({ settings, sessions: [], assessments: [a], dayChoices: [], now: new Date(2026, 9, 9, 12) });
    expect(s?.plan.assessmentDue).toBe(false);
    expect(s?.overallLevel).toBe('A2');
  });
});

describe('formatos', () => {
  it('formatea minutos y horas', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(255)).toBe('4 h 15 min');
    expect(formatHours(90)).toBe('1,5 h');
  });
});
