import { isAssessmentDue, curriculumWeek, generatePlanDay, MINIMUM_DAY_MINUTES, type PlanDay } from '../domain/plan';
import { computeAlerts, currentSkillScores, dailyTotals, streak, type DailyTotals, type StudyAlert } from '../domain/progress';
import { dayKey, programDay } from '../domain/time';
import { scoreToCefr, overallScore } from '../domain/scoring';
import type { CefrEstimate, Module, SkillScores } from '../domain/types';
import type { DayChoice, Settings, StoredAssessment, StudySession } from '../db/db';

export interface TodayState {
  todayKey: string;
  dayNumber: number;
  plan: PlanDay;
  scores: SkillScores;
  overallLevel: CefrEstimate;
  /** Minutos hechos hoy por módulo. */
  doneByModule: Partial<Record<Module, number>>;
  totals: Map<string, DailyTotals>;
  today: DailyTotals;
  alerts: StudyAlert[];
  streak: number;
  studyWeek: number;
  isMinimum: boolean;
}

export function deriveToday(params: {
  settings: Settings;
  sessions: readonly StudySession[];
  assessments: readonly StoredAssessment[];
  dayChoices: readonly DayChoice[];
  now: Date;
}): TodayState | null {
  const { settings, sessions, assessments, now } = params;
  if (!settings.startDate) return null;
  const todayKey = dayKey(now);
  const dayNumber = Math.max(1, programDay(settings.startDate, todayKey));
  const sorted = [...assessments].sort((a, b) => a.takenAt - b.takenAt);
  const last = sorted.at(-1);
  const scores = currentSkillScores({ lastAssessment: last?.completed ?? null, sessions, today: todayKey });
  // Re-evaluaciones (no cuenta el diagnóstico inicial como re-evaluación del día 7).
  const weeklyDays = sorted.filter((a) => a.kind === 'weekly').map((a) => a.dayNumber);
  const due = isAssessmentDue(dayNumber, weeklyDays);
  const isMinimum = params.dayChoices.some((c) => c.dayKey === todayKey);
  const plan = generatePlanDay({ dayNumber, scores, assessmentDue: due, forceMinimum: isMinimum });

  const doneByModule: Partial<Record<Module, number>> = {};
  for (const s of sessions) {
    if (s.dayKey !== todayKey) continue;
    doneByModule[s.module] = (doneByModule[s.module] ?? 0) + s.seconds / 60;
  }
  const totals = dailyTotals(sessions);
  const today = totals.get(todayKey) ?? { dayKey: todayKey, activeMinutes: 0, inputMinutes: 0, performance: null };
  const studiedDays = [...totals.values()].filter((t) => t.dayKey < todayKey && t.activeMinutes + t.inputMinutes >= MINIMUM_DAY_MINUTES).length;

  return {
    todayKey,
    dayNumber,
    plan,
    scores,
    overallLevel: scoreToCefr(overallScore(scores)),
    doneByModule,
    totals,
    today,
    alerts: computeAlerts(totals, todayKey, settings.startDate),
    streak: streak(totals, todayKey),
    studyWeek: curriculumWeek(studiedDays),
    isMinimum,
  };
}

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export function formatHours(min: number): string {
  return `${(min / 60).toFixed(1).replace('.', ',')} h`;
}
