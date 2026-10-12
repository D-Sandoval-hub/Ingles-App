/**
 * Detector de errores típicos de hispanohablantes, basado en reglas.
 * Funciona sin internet y sin IA. Solo detecta patrones conocidos: no reemplaza
 * una corrección completa. Puede dar falsos positivos en frases poco comunes.
 */
export interface ErrorRule {
  tag: string;
  label: string;
  pattern: RegExp;
  explanation: string;
  example: { wrong: string; right: string };
}

const AUX_BEFORE = "(?<!\\b(?:does|doesn't|did|didn't|can|can't|will|won't|would|should|could|might|must|may|let|make|makes|made|help|helps|to)\\s)";

export const ERROR_RULES: readonly ErrorRule[] = [
  {
    tag: 'have_age',
    label: 'Edad con "have"',
    pattern: /\b(I|you|he|she|we|they) (have|has) (\d{1,3}|[a-z]+(?:-[a-z]+)?) years(?: old)?(?=\s*(?:[.,!?;]|$|and\b|but\b))/gi,
    explanation: 'En inglés la edad se dice con "to be", no con "have".',
    example: { wrong: 'I have 25 years.', right: "I'm 25 (years old)." },
  },
  {
    tag: 'people_is',
    label: '"People" es plural',
    pattern: /\bpeople (is|was|has)\b/gi,
    explanation: '"People" es plural en inglés: people are / were / have.',
    example: { wrong: 'People is nice here.', right: 'People are nice here.' },
  },
  {
    tag: 'explain_me',
    label: '"Explain" + persona',
    pattern: /\bexplain(?:s|ed)? (me|him|her|us|them)\b/gi,
    explanation: '"Explain" necesita "to" antes de la persona.',
    example: { wrong: 'Can you explain me this?', right: 'Can you explain this to me?' },
  },
  {
    tag: 'depend_of',
    label: '"Depend of"',
    pattern: /\bdepend(?:s|ed|ing)? of\b/gi,
    explanation: 'Se dice "depend on", no "depend of".',
    example: { wrong: 'It depends of the price.', right: 'It depends on the price.' },
  },
  {
    tag: 'am_agree',
    label: '"I am agree"',
    pattern: /\b(I'm|I am|we're|we are|they're|they are|he's|he is|she's|she is) agree\b/gi,
    explanation: '"Agree" es un verbo, no un adjetivo: "I agree".',
    example: { wrong: 'I am agree with you.', right: 'I agree with you.' },
  },
  {
    tag: 'more_better',
    label: 'Doble comparativo',
    pattern: /\bmore (better|worse|bigger|easier|faster|cheaper|smaller|older|younger)\b/gi,
    explanation: 'El comparativo con -er (o better/worse) no lleva "more".',
    example: { wrong: 'This is more better.', right: 'This is better.' },
  },
  {
    tag: 'third_person',
    label: 'Tercera persona (he/she/it)',
    pattern: new RegExp(`${AUX_BEFORE}\\b(he|she|it) (don't|have|go|want|need|like|work|live|think|know)\\b`, 'gi'),
    explanation: 'Con he/she/it en presente simple el verbo lleva -s (has, goes, wants) y la negación es "doesn\'t".',
    example: { wrong: 'She have a car. He don\'t know.', right: "She has a car. He doesn't know." },
  },
  {
    tag: 'did_past',
    label: 'Pasado después de "did"',
    pattern: /\b(didn't|did not|doesn't|does not) (went|saw|had|was|did|made|came|said|got|took|wanted|liked|worked|knew|thought)\b/gi,
    explanation: 'Después de did/didn\'t/doesn\'t el verbo va en forma base.',
    example: { wrong: "I didn't went.", right: "I didn't go." },
  },
  {
    tag: 'say_me',
    label: '"Say me"',
    pattern: /\bsay (me|him|her|us|them)\b/gi,
    explanation: 'Con la persona se usa "tell": tell me. "Say" va sin persona o con "to": say something to me.',
    example: { wrong: 'Say me the answer.', right: 'Tell me the answer.' },
  },
  {
    tag: 'uncountable_plural',
    label: 'Sustantivo incontable en plural',
    pattern: /\b(informations|advices|furnitures|equipments|softwares|feedbacks|knowledges|homeworks|evidences)\b/gi,
    explanation: 'Estos sustantivos son incontables en inglés: no llevan -s. Usa "a piece of" o "some".',
    example: { wrong: 'I need more informations.', right: 'I need more information.' },
  },
  {
    tag: 'since_for',
    label: '"Since" vs. "for"',
    pattern: /\bsince (\d+|two|three|four|five|six|seven|eight|nine|ten|many|a few) (years|months|weeks|days|hours|minutes)\b/gi,
    explanation: 'Con una duración se usa "for"; "since" va con un punto de inicio (since 2020, since Monday).',
    example: { wrong: 'I have lived here since 3 years.', right: 'I have lived here for 3 years.' },
  },
  {
    tag: 'assist_attend',
    label: 'Falso amigo: "assist"',
    pattern: /\bassist(?:ed|ing|s)? (?:to |at )?(?:the |a |an )?(meeting|class|classes|conference|event|party|course|wedding)\b/gi,
    explanation: '"Assist" significa ayudar. "Asistir a" un evento es "attend".',
    example: { wrong: 'I assisted to the meeting.', right: 'I attended the meeting.' },
  },
  {
    tag: 'make_question',
    label: '"Make a question"',
    pattern: /\bmak(?:e|es|ing) (a|the|some|many|more) questions?\b/gi,
    explanation: 'Se dice "ask a question".',
    example: { wrong: 'Can I make a question?', right: 'Can I ask a question?' },
  },
  {
    tag: 'generic_the',
    label: '"The" en afirmaciones generales',
    pattern: /(?:^|[.!?]\s+)the (life|people|love|nature|society|money|time|technology|health) (is|are)\b/gi,
    explanation: 'Para hablar en general, sin "the": Life is…, People are…',
    example: { wrong: 'The life is hard.', right: 'Life is hard.' },
  },
  {
    tag: 'missing_it',
    label: 'Falta el sujeto "it"',
    pattern: /(?:^|[.!?]\s+)is (important|necessary|possible|impossible|difficult|easy|good|bad|true|normal)\b/gi,
    explanation: 'En inglés el sujeto es obligatorio: "It is important…".',
    example: { wrong: 'Is important to study.', right: "It's important to study." },
  },
  {
    tag: 'want_that',
    label: '"Want that you…"',
    pattern: /\bwants? that (you|he|she|they|we|I|him|her|them)\b/gi,
    explanation: 'Se dice "want + persona + to + verbo".',
    example: { wrong: 'I want that you come.', right: 'I want you to come.' },
  },
  {
    tag: 'married_with',
    label: '"Married with"',
    pattern: /\bmarried with\b/gi,
    explanation: 'Se dice "married to" (estar casado con).',
    example: { wrong: 'She is married with John.', right: 'She is married to John.' },
  },
  {
    tag: 'discuss_about',
    label: '"Discuss about"',
    pattern: /\bdiscuss(?:es|ed|ing)? about\b/gi,
    explanation: '"Discuss" no lleva "about": discuss the problem. (Sí se dice "talk about".)',
    example: { wrong: "Let's discuss about the plan.", right: "Let's discuss the plan." },
  },
  {
    tag: 'how_called',
    label: '"How is it called?"',
    pattern: /\bhow is (?:it |this |that )?called\b/gi,
    explanation: 'Se pregunta "What is it called?".',
    example: { wrong: 'How is it called in English?', right: 'What is it called in English?' },
  },
  {
    tag: 'for_to',
    label: '"For to" + verbo',
    pattern: /\bfor to [a-z]+/gi,
    explanation: 'Para expresar propósito se usa solo "to": I came to learn.',
    example: { wrong: 'I came for to learn.', right: 'I came to learn.' },
  },
  {
    tag: 'every_plural',
    label: '"Every" + plural',
    pattern: /\bevery (days|weeks|months|years|times|persons|people)\b/gi,
    explanation: '"Every" va con singular: every day, every week, everyone.',
    example: { wrong: 'I study every days.', right: 'I study every day.' },
  },
  {
    tag: 'plural_adjective',
    label: 'Adjetivo en plural',
    pattern: /\b(differents|importants|interestings|beautifuls|expensives)\b/gi,
    explanation: 'Los adjetivos en inglés no tienen plural.',
    example: { wrong: 'They are differents.', right: 'They are different.' },
  },
];

export interface DetectedError {
  tag: string;
  label: string;
  match: string;
  index: number;
  explanation: string;
  example: { wrong: string; right: string };
}

export function detectErrors(text: string): DetectedError[] {
  const found: DetectedError[] = [];
  for (const rule of ERROR_RULES) {
    rule.pattern.lastIndex = 0;
    for (const m of text.matchAll(rule.pattern)) {
      found.push({
        tag: rule.tag,
        label: rule.label,
        match: m[0].trim(),
        index: m.index,
        explanation: rule.explanation,
        example: rule.example,
      });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

/** Etiquetas más frecuentes (para "errores recurrentes"). */
export function topErrors(tags: readonly string[], limit = 5): { tag: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count, label: ERROR_RULES.find((r) => r.tag === tag)?.label ?? tag }));
}
