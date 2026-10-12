import type { CefrLevel } from '../domain/types';

/** Ejercicios de práctica (distintos de los del test). Enfocados en errores típicos de hispanohablantes. */
export interface PracticeGrammarItem {
  id: string;
  level: CefrLevel;
  prompt: string;
  options: readonly string[];
  answer: number;
  explanation: string;
  /** Etiqueta de error (coincide con domain/errors.ts) para registrar errores recurrentes. */
  tag: string;
}

export const PRACTICE_GRAMMAR: readonly PracticeGrammarItem[] = [
  { id: 'p01', level: 'A1', tag: 'have_age', prompt: 'My son ___ ten years old.', options: ['has', 'is', 'have', 'are'], answer: 1, explanation: 'Edad con "be": He is ten.' },
  { id: 'p02', level: 'A1', tag: 'third_person', prompt: 'He ___ coffee every morning.', options: ['drink', 'drinks', 'drinking', 'is drink'], answer: 1, explanation: 'He/she/it + verbo con -s.' },
  { id: 'p03', level: 'A1', tag: 'third_person', prompt: 'She ___ have a car.', options: ["don't", "doesn't", 'not', "isn't"], answer: 1, explanation: 'Negación con she: doesn\'t + verbo base.' },
  { id: 'p04', level: 'A1', tag: 'missing_it', prompt: '___ very cold today.', options: ['Is', "It's", 'Are', 'This'], answer: 1, explanation: 'El sujeto es obligatorio: It\'s cold.' },
  { id: 'p05', level: 'A2', tag: 'people_is', prompt: 'The people at work ___ really nice.', options: ['is', 'are', 'was', 'has'], answer: 1, explanation: '"People" es plural.' },
  { id: 'p06', level: 'A2', tag: 'explain_me', prompt: 'Could you explain ___?', options: ['me this word', 'this word to me', 'to me this word', 'me to this word'], answer: 1, explanation: 'Explain something to someone.' },
  { id: 'p07', level: 'A2', tag: 'depend_of', prompt: 'The price depends ___ the size.', options: ['of', 'on', 'from', 'at'], answer: 1, explanation: 'Depend on.' },
  { id: 'p08', level: 'A2', tag: 'am_agree', prompt: 'I ___ with you.', options: ['am agree', 'agree', 'am agreed', 'agreeing'], answer: 1, explanation: '"Agree" es verbo: I agree.' },
  { id: 'p09', level: 'A2', tag: 'more_better', prompt: 'Your plan is ___ than mine.', options: ['more better', 'better', 'more good', 'gooder'], answer: 1, explanation: 'Better, sin "more".' },
  { id: 'p10', level: 'A2', tag: 'did_past', prompt: "I didn't ___ the email.", options: ['saw', 'see', 'seen', 'seeing'], answer: 1, explanation: 'Después de didn\'t: verbo base.' },
  { id: 'p11', level: 'A2', tag: 'say_me', prompt: 'Can you ___ me your name?', options: ['say', 'tell', 'speak', 'talk'], answer: 1, explanation: 'Tell + persona.' },
  { id: 'p12', level: 'A2', tag: 'uncountable_plural', prompt: 'Thanks for the ___.', options: ['advices', 'advice', 'an advice', 'advise'], answer: 1, explanation: '"Advice" es incontable (sustantivo); "advise" es el verbo.' },
  { id: 'p13', level: 'A2', tag: 'every_plural', prompt: 'I go to the gym every ___.', options: ['days', 'day', 'the day', 'of day'], answer: 1, explanation: 'Every + singular.' },
  { id: 'p14', level: 'B1', tag: 'since_for', prompt: "I've studied English ___ six months.", options: ['since', 'for', 'during', 'from'], answer: 1, explanation: 'For + duración.' },
  { id: 'p15', level: 'B1', tag: 'since_for', prompt: "I've worked here ___ March.", options: ['for', 'since', 'during', 'from'], answer: 1, explanation: 'Since + punto de inicio.' },
  { id: 'p16', level: 'B1', tag: 'assist_attend', prompt: 'Did you ___ the conference?', options: ['assist', 'attend', 'assist to', 'attend to'], answer: 1, explanation: '"Attend" = asistir a. "Assist" = ayudar.' },
  { id: 'p17', level: 'B1', tag: 'make_question', prompt: 'Can I ___ a question?', options: ['make', 'ask', 'do', 'say'], answer: 1, explanation: 'Ask a question.' },
  { id: 'p18', level: 'B1', tag: 'want_that', prompt: 'My boss wants ___ the report today.', options: ['that I finish', 'me to finish', 'me finish', 'that I to finish'], answer: 1, explanation: 'Want + persona + to + verbo.' },
  { id: 'p19', level: 'B1', tag: 'generic_the', prompt: '___ is expensive in big cities.', options: ['The life', 'Life', 'A life', 'The lives'], answer: 1, explanation: 'Afirmación general: sin "the".' },
  { id: 'p20', level: 'B1', tag: 'discuss_about', prompt: "Let's discuss ___ tomorrow.", options: ['about the budget', 'the budget', 'of the budget', 'on the budget'], answer: 1, explanation: 'Discuss + objeto directo, sin "about".' },
  { id: 'p21', level: 'B1', tag: 'false_friend_actually', prompt: '"Actually" significa…', options: ['actualmente', 'en realidad', 'activamente', 'de hecho, ahora mismo'], answer: 1, explanation: 'Falso amigo. "Actualmente" = currently / nowadays.' },
  { id: 'p22', level: 'B1', tag: 'false_friend_embarrassed', prompt: '"I\'m embarrassed" significa…', options: ['estoy embarazada', 'me da vergüenza', 'estoy enojado', 'estoy cansado'], answer: 1, explanation: 'Falso amigo. "Embarazada" = pregnant.' },
  { id: 'p23', level: 'B1', tag: 'false_friend_career', prompt: 'Para decir "estudio la carrera de ingeniería" se dice…', options: ['I study the engineering career', 'I study engineering / I\'m an engineering major', 'I make engineering', 'I career engineering'], answer: 1, explanation: '"Career" es la trayectoria laboral, no los estudios universitarios.' },
  { id: 'p24', level: 'B2', tag: 'how_called', prompt: '___ in English?', options: ['How is it called', 'What is it called', 'How it is called', 'What it is called'], answer: 1, explanation: 'What is it called?' },
  { id: 'p25', level: 'B2', tag: 'false_friend_sensible', prompt: '"She is very sensitive" significa…', options: ['es muy sensata', 'es muy sensible', 'es muy sana', 'es muy simpática'], answer: 1, explanation: 'Sensitive = sensible. Sensible = sensato.' },
];

/** Frases para dictado de práctica, incluidas formas reducidas del habla conectada. */
export const PRACTICE_DICTATION: readonly { id: string; level: CefrLevel; text: string }[] = [
  { id: 'pd01', level: 'A1', text: 'What time is it?' },
  { id: 'pd02', level: 'A1', text: 'I need a cup of coffee.' },
  { id: 'pd03', level: 'A1', text: 'She lives near the park.' },
  { id: 'pd04', level: 'A1', text: 'Can I have the check, please?' },
  { id: 'pd05', level: 'A2', text: "I'm going to call you later." },
  { id: 'pd06', level: 'A2', text: 'Did you have a good weekend?' },
  { id: 'pd07', level: 'A2', text: "We don't have enough time." },
  { id: 'pd08', level: 'A2', text: "What do you want to do tonight?" },
  { id: 'pd09', level: 'A2', text: "It's a lot cheaper than I thought." },
  { id: 'pd10', level: 'B1', text: "I've never been to the United States." },
  { id: 'pd11', level: 'B1', text: "Could you send me the file when you get a chance?" },
  { id: 'pd12', level: 'B1', text: "I didn't know you were coming." },
  { id: 'pd13', level: 'B1', text: "Let me know if you need anything else." },
  { id: 'pd14', level: 'B1', text: "We should've left a little earlier." },
  { id: 'pd15', level: 'B2', text: "I'd rather not talk about it right now." },
  { id: 'pd16', level: 'B2', text: "It turned out to be a lot harder than we expected." },
  { id: 'pd17', level: 'B2', text: "If you'd asked me, I would've helped you out." },
  { id: 'pd18', level: 'B2', text: "I'm looking forward to hearing from you." },
];
