import { PRACTICE_DICTATION, PRACTICE_GRAMMAR, type PracticeGrammarItem } from '../content/practice';
import { scoreToCefr } from '../domain/scoring';
import { CEFR_LEVELS, type CefrLevel } from '../domain/types';

/** Niveles de ejercicios adecuados: hasta un nivel por sobre el estimado. */
export function levelsUpTo(score: number): CefrLevel[] {
  const est = scoreToCefr(score);
  const idx = est === 'Pre-A1' ? 0 : CEFR_LEVELS.indexOf(est);
  return CEFR_LEVELS.slice(0, Math.min(CEFR_LEVELS.length, idx + 2));
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

export function pickDictation(score: number, n: number) {
  const levels = levelsUpTo(score);
  return shuffle(PRACTICE_DICTATION.filter((d) => levels.includes(d.level))).slice(0, n);
}

/** Gramática: primero las etiquetas de tus errores recurrentes, luego el resto de tu nivel. */
export function pickGrammar(score: number, n: number, recurrentTags: readonly string[] = []): PracticeGrammarItem[] {
  const levels = levelsUpTo(score);
  const pool = PRACTICE_GRAMMAR.filter((g) => levels.includes(g.level));
  const prioritized = shuffle(pool.filter((g) => recurrentTags.includes(g.tag)));
  const rest = shuffle(pool.filter((g) => !recurrentTags.includes(g.tag)));
  return [...prioritized, ...rest].slice(0, n);
}

export function speakingPrompts(week: number): string[] {
  const all = [
    ['Introduce yourself: name, job or studies, where you live.', 'Describe your daily routine.', 'Talk about your family.'],
    ['What did you do last weekend?', 'Describe your last vacation.', 'Order food at a restaurant (role-play both sides).'],
    ['What are your plans for next month?', 'Do you prefer working from home or at the office? Why?', 'Agree or disagree: "Social media does more harm than good."'],
    ['Job interview: tell me about yourself and your strengths.', 'Explain a technical problem you solved, step by step.', 'Small talk: the weather, weekend plans, a series you like.'],
  ];
  return all[Math.min(week, all.length) - 1] ?? all[0] ?? [];
}

export function tutorPrompt(level: string, scenario: string): string {
  return `Act as my English conversation tutor. My level is about ${level} and my native language is Chilean Spanish. Let's do a role-play: ${scenario}
Rules:
- Speak in natural American English adapted to my level. Keep each turn short (1–3 sentences) and ask me a question to keep the conversation going.
- Do not interrupt me to correct. At the END of each of my turns, add a short "Corrección" section: quote my mistakes, explain each one briefly in Spanish, and give the natural version.
- If you are not sure whether an expression is natural, say so.
Start the role-play now.`;
}

export function writingPrompt(level: string): string {
  return `Act as my English writing teacher. My level is about ${level}; my native language is Chilean Spanish. I will paste a text.
1. List each mistake: quote it, explain briefly in Spanish, give the correction.
2. Then rewrite my text in natural American English, keeping my ideas.
3. Point out 2–3 Spanish-influenced patterns I repeat.
If you are not sure about a rule or expression, mark it as "a verificar".
Here is my text:
`;
}
