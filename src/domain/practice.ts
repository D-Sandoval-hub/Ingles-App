import type { SkillScores } from './types';

export type PracticeActivity = 'srs' | 'grammar' | 'dictation';

export interface PracticeStep {
  activity: PracticeActivity;
  minutes: number;
}

/** Segundos promedio por repaso de tarjeta (estimación conservadora). */
const SECONDS_PER_REVIEW = 10;

/**
 * Práctica libre (5–15 min): decide automáticamente qué repasar.
 * 1) Tarjetas vencidas primero (hasta 60 % del tiempo): son las que se olvidan si no se repasan.
 * 2) El resto a la habilidad más débil entre gramática y listening; con 15 min se reparte en dos.
 */
export function pickPractice(params: { minutes: number; dueCount: number; scores: SkillScores }): PracticeStep[] {
  const total = Math.max(1, Math.round(params.minutes));
  const steps: PracticeStep[] = [];
  let remaining = total;

  if (params.dueCount > 0) {
    const needed = Math.ceil((params.dueCount * SECONDS_PER_REVIEW) / 60);
    const srs = Math.max(2, Math.min(Math.floor(total * 0.6), needed));
    const capped = Math.min(srs, total);
    steps.push({ activity: 'srs', minutes: capped });
    remaining -= capped;
  }
  if (remaining <= 0) return steps;

  const grammarFirst = params.scores.grammar <= params.scores.listening;
  const [first, second]: [PracticeActivity, PracticeActivity] = grammarFirst ? ['grammar', 'dictation'] : ['dictation', 'grammar'];
  if (remaining >= 8) {
    const a = Math.ceil(remaining * 0.6);
    steps.push({ activity: first, minutes: a }, { activity: second, minutes: remaining - a });
  } else {
    steps.push({ activity: first, minutes: remaining });
  }
  return steps;
}
