import type { Module } from '../domain/types';

/**
 * Objetivos por semana de estudio (no por fecha: si pierdes días, no te saltas contenido).
 * Semanas 1–4: programa de 30 días. Después: ciclo continuo por nivel.
 */
type WeekObjectives = Partial<Record<Module, readonly string[]>>;

export const CURRICULUM: readonly WeekObjectives[] = [
  {
    srs: ['Palabras 1–250 de la NGSL (las más frecuentes)', 'Marca "Ya la sé" en las que domines para no perder tiempo'],
    listening: ['Dictados A1–A2: frases cortas del día a día', 'Reconocer contracciones: I\'m, don\'t, it\'s, we\'re'],
    pronunciation: ['Vocales cortas vs. largas: ship/sheep, live/leave', 'Consonantes finales: no "comerse" la -s y la -ed'],
    conversation: ['Presentarte: nombre, trabajo, de dónde eres', 'Hablar de tu rutina en presente simple (en voz alta, 2–3 min)'],
    grammar_writing: ['Presente simple: -s de tercera persona, do/does', 'Errores típicos: "I have 25 years", "people is"', 'Escribe 5 frases sobre tu rutina y revísalas con el detector'],
    review: ['Repasa los errores recurrentes de la semana', 'Rehaz los dictados en los que fallaste'],
  },
  {
    srs: ['Palabras 251–500', 'Mantén el repaso diario aunque el día sea mínimo'],
    listening: ['Dictados A2–B1 con números, horas y fechas', 'Habla conectada: gonna, wanna, gotta'],
    pronunciation: ['Terminación -ed: /t/, /d/, /ɪd/ (worked, played, wanted)', 'Sonido th: think / this'],
    conversation: ['Contar qué hiciste ayer y el fin de semana (pasado simple)', 'Pedir algo en un café o restaurante'],
    grammar_writing: ['Pasado simple regular e irregular', 'Did/didn\'t + verbo base', 'Escribe un correo corto contando tu fin de semana'],
    review: ['Repaso de la semana + re-evaluación'],
  },
  {
    srs: ['Palabras 501–750', 'Si el repaso acumulado supera 150, la app baja las nuevas automáticamente'],
    listening: ['Dictados B1: preguntas indirectas y modales', 'Reducciones: whatcha, gimme, lemme, kinda'],
    pronunciation: ['Schwa /ə/ en sílabas débiles (about, banana)', 'Acento de palabra: PHOtograph, phoTOgraphy'],
    conversation: ['Planes y futuro: going to / will', 'Dar tu opinión y estar de acuerdo o en desacuerdo'],
    grammar_writing: ['Present perfect vs. pasado simple; for vs. since', 'Futuro: going to, will, presente continuo', 'Escribe tus planes para el próximo mes (100 palabras)'],
    review: ['Repaso de la semana + re-evaluación'],
  },
  {
    srs: ['Palabras 751–1000', 'Prioriza las tarjetas con más olvidos'],
    listening: ['Dictados B1–B2 con habla rápida', 'Linking: "turn it off" → "tur-ni-toff"'],
    pronunciation: ['b/v (en inglés sí se distinguen)', 'Entonación de preguntas: sí/no ↗, wh- ↘'],
    conversation: ['Entrevista de trabajo: experiencia y fortalezas', 'Explicar un problema técnico paso a paso'],
    grammar_writing: ['Condicionales 1 y 2', 'Want someone to…, suggest + -ing', 'Escribe un correo formal explicando un problema y una solución'],
    review: ['Repaso final + evaluación del día 30'],
  },
];

export const CONTINUATION: readonly WeekObjectives[] = [
  {
    srs: ['Palabras 1001+ de la NGSL y vocabulario temático (trabajo, tecnología)'],
    listening: ['Podcasts nativos con transcripción: dictado de fragmentos de 30 s'],
    pronunciation: ['Shadowing de 1–2 minutos de audio nativo'],
    conversation: ['Role-plays B1–B2: reuniones, negociación, small talk'],
    grammar_writing: ['Tercer condicional, verbos modales en pasado (must have, should have)'],
    review: ['Repaso de la semana'],
  },
  {
    srs: ['Phrasal verbs y colocaciones frecuentes'],
    listening: ['Series sin subtítulos en español (con subtítulos en inglés)'],
    pronunciation: ['Ritmo y acento de oración: palabras de contenido vs. de función'],
    conversation: ['Debatir y matizar opiniones (B2–C1)'],
    grammar_writing: ['Inversiones y estructuras enfáticas (C1)'],
    review: ['Repaso de la semana'],
  },
];

export function objectivesFor(module: Module, studyWeek: number): readonly string[] {
  const week = studyWeek <= CURRICULUM.length ? CURRICULUM[studyWeek - 1] : CONTINUATION[(studyWeek - CURRICULUM.length - 1) % CONTINUATION.length];
  if (module === 'input') return ['Escucha contenido de tu nivel (sugerencias abajo)', 'Registra el tiempo y cuánto entendiste'];
  if (module === 'assessment') return ['Re-evaluación por habilidad (~25 min)', 'Compara con tu resultado anterior en el panel'];
  return week?.[module] ?? [];
}
