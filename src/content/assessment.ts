import type { CefrLevel } from '../domain/types';

/**
 * Banco de ítems del test diagnóstico y las re-evaluaciones.
 * Todo el contenido fue escrito para esta app (sin material con copyright).
 * Las pseudopalabras y la banda "más allá de NGSL" están marcadas como "a verificar".
 */

// ---------- Vocabulario (sí / no) ----------

export interface VocabBandDef {
  id: string;
  label: string;
  /** Cuántas palabras representa la banda (para estimar el tamaño de vocabulario). */
  size: number;
  /** Rango NGSL [desde, hasta], o null si la banda usa la lista `BEYOND_NGSL`. */
  ngslRange: readonly [number, number] | null;
}

export const VOCAB_BANDS: readonly VocabBandDef[] = [
  { id: 'k1a', label: 'NGSL 1–500', size: 500, ngslRange: [1, 500] },
  { id: 'k1b', label: 'NGSL 501–1000', size: 500, ngslRange: [501, 1000] },
  { id: 'k2', label: 'NGSL 1001–2000', size: 1000, ngslRange: [1001, 2000] },
  { id: 'k3', label: 'NGSL 2001–2809', size: 809, ngslRange: [2001, 2809] },
  { id: 'beyond', label: 'Más allá de NGSL (aprox. 3.000–6.000)', size: 2000, ngslRange: null },
];

export const VOCAB_ITEMS_PER_BAND = 10;
export const PSEUDOWORDS_PER_TEST = 12;

/** Palabras reales de frecuencia media-baja, fuera de la NGSL. Banda aproximada — a verificar. */
export const BEYOND_NGSL: readonly string[] = [
  'reluctant', 'thrive', 'scrutiny', 'endorse', 'deem', 'plausible', 'mundane', 'elicit',
  'hinder', 'tedious', 'compelling', 'ambiguous', 'mitigate', 'cohesive', 'feasible', 'notorious',
  'prevail', 'refrain', 'tentative', 'eloquent', 'allegedly', 'incentive', 'inevitable', 'discrepancy',
  'convey', 'intricate', 'bewildered', 'grumpy', 'stubborn', 'reckless',
];

/** Pseudopalabras con apariencia inglesa. Revisadas a mano; a verificar que ninguna exista. */
export const PSEUDOWORDS: readonly string[] = [
  'plinder', 'brastic', 'mornity', 'glamber', 'crenth', 'sloonish', 'veltrous', 'abstrent',
  'frodelic', 'ramplish', 'dorbish', 'blenstry', 'quorbid', 'obsting', 'trenical', 'sterkle',
];

// ---------- Gramática (opción múltiple) ----------

export interface GrammarItem {
  id: string;
  level: CefrLevel;
  prompt: string;
  options: readonly string[];
  answer: number;
  /** Explicación breve en español (se muestra al corregir). */
  explanation: string;
  /** Si está en el formulario diagnóstico fijo. */
  diagnostic: boolean;
}

export const GRAMMAR_ITEMS: readonly GrammarItem[] = [
  // A1
  { id: 'g01', level: 'A1', diagnostic: true, prompt: 'I ___ 28 years old.', options: ['have', 'am', 'has', 'is'], answer: 1, explanation: 'La edad se expresa con "to be": I am 28.' },
  { id: 'g02', level: 'A1', diagnostic: true, prompt: 'She ___ in a bank.', options: ['work', 'working', 'works', 'is work'], answer: 2, explanation: 'Presente simple con she: verbo + s.' },
  { id: 'g03', level: 'A1', diagnostic: true, prompt: '___ you like coffee?', options: ['Are', 'Do', 'Does', 'Is'], answer: 1, explanation: 'Preguntas en presente simple con "do" (you).' },
  { id: 'g04', level: 'A1', diagnostic: true, prompt: 'There ___ two chairs in the room.', options: ['is', 'are', 'has', 'have'], answer: 1, explanation: '"There are" con plural (hay).' },
  { id: 'g05', level: 'A1', diagnostic: true, prompt: 'My brother ___ like fish.', options: ["don't", "doesn't", 'not', "isn't"], answer: 1, explanation: 'Negación en tercera persona: doesn\'t + verbo base.' },
  { id: 'g06', level: 'A1', diagnostic: false, prompt: 'This is ___ umbrella.', options: ['a', 'an', 'the a', '—'], answer: 1, explanation: '"an" antes de sonido vocal.' },
  { id: 'g07', level: 'A1', diagnostic: false, prompt: 'We ___ at home yesterday.', options: ['are', 'were', 'was', 'be'], answer: 1, explanation: 'Pasado de "be" con we: were.' },
  { id: 'g08', level: 'A1', diagnostic: false, prompt: 'Where ___ she live?', options: ['do', 'is', 'does', 'are'], answer: 2, explanation: 'Pregunta con she: does + verbo base.' },
  // A2
  { id: 'g09', level: 'A2', diagnostic: true, prompt: 'I ___ to the cinema last weekend.', options: ['go', 'went', 'have gone', 'was go'], answer: 1, explanation: 'Momento terminado en el pasado (last weekend): pasado simple.' },
  { id: 'g10', level: 'A2', diagnostic: true, prompt: 'People ___ very friendly in this city.', options: ['is', 'are', 'was', 'has'], answer: 1, explanation: '"People" es plural.' },
  { id: 'g11', level: 'A2', diagnostic: true, prompt: 'Look! It ___.', options: ['rains', 'is raining', 'rain', 'raining'], answer: 1, explanation: 'Algo que pasa ahora mismo: presente continuo.' },
  { id: 'g12', level: 'A2', diagnostic: true, prompt: 'This phone is ___ than my old one.', options: ['more good', 'better', 'more better', 'best'], answer: 1, explanation: 'Comparativo irregular de good: better (sin "more").' },
  { id: 'g13', level: 'A2', diagnostic: true, prompt: 'Can you explain ___?', options: ['me the problem', 'the problem to me', 'to me the problem', 'me to the problem'], answer: 1, explanation: '"Explain something to someone".' },
  { id: 'g14', level: 'A2', diagnostic: true, prompt: "I'm ___ my vacation next month.", options: ['going to take', 'take', 'took', 'taking to'], answer: 0, explanation: 'Plan futuro: be going to + verbo.' },
  { id: 'g15', level: 'A2', diagnostic: false, prompt: 'How ___ money do you have?', options: ['many', 'much', 'lot', 'more'], answer: 1, explanation: '"Money" es incontable: how much.' },
  { id: 'g16', level: 'A2', diagnostic: false, prompt: 'She ___ TV when I called.', options: ['watched', 'was watching', 'watches', 'is watching'], answer: 1, explanation: 'Acción en progreso interrumpida: pasado continuo.' },
  { id: 'g17', level: 'A2', diagnostic: false, prompt: 'It depends ___ the weather.', options: ['of', 'on', 'from', 'in'], answer: 1, explanation: '"Depend on", no "depend of".' },
  // B1
  { id: 'g18', level: 'B1', diagnostic: true, prompt: 'I ___ here since 2019.', options: ['live', 'am living', 'have lived', 'lived'], answer: 2, explanation: 'Desde un punto en el pasado hasta hoy: present perfect.' },
  { id: 'g19', level: 'B1', diagnostic: true, prompt: 'If I ___ more time, I would travel more.', options: ['have', 'had', 'will have', 'would have'], answer: 1, explanation: 'Segundo condicional: if + pasado, would + verbo.' },
  { id: 'g20', level: 'B1', diagnostic: true, prompt: 'I want ___ with me.', options: ['that you come', 'you come', 'you to come', 'that you to come'], answer: 2, explanation: '"Want + persona + to + verbo".' },
  { id: 'g21', level: 'B1', diagnostic: true, prompt: 'The report ___ by the manager yesterday.', options: ['wrote', 'was written', 'has written', 'is writing'], answer: 1, explanation: 'Voz pasiva en pasado: was/were + participio.' },
  { id: 'g22', level: 'B1', diagnostic: true, prompt: "I'm used to ___ up early.", options: ['get', 'getting', 'got', 'gets'], answer: 1, explanation: '"Be used to" + -ing (estar acostumbrado a).' },
  { id: 'g23', level: 'B1', diagnostic: true, prompt: 'She asked me where ___.', options: ['do I live', 'I lived', 'did I live', 'I do live'], answer: 1, explanation: 'Pregunta indirecta: orden de afirmación, sin "do".' },
  { id: 'g24', level: 'B1', diagnostic: false, prompt: 'I have worked here ___ three years.', options: ['since', 'for', 'during', 'from'], answer: 1, explanation: '"For" + duración; "since" + punto de inicio.' },
  { id: 'g25', level: 'B1', diagnostic: false, prompt: 'He ___ smoke, but he quit last year.', options: ['used to', 'use to', 'was used to', 'is used to'], answer: 0, explanation: '"Used to" = hábito pasado que ya no ocurre.' },
  { id: 'g26', level: 'B1', diagnostic: false, prompt: 'This is the woman ___ helped me.', options: ['which', 'who', 'whose', 'what'], answer: 1, explanation: 'Pronombre relativo para personas: who.' },
  { id: 'g27', level: 'B1', diagnostic: false, prompt: 'You ___ wear a suit. It\'s optional.', options: ["mustn't", "don't have to", "can't", "shouldn't to"], answer: 1, explanation: '"Don\'t have to" = no es necesario. "Mustn\'t" = está prohibido.' },
  // B2
  { id: 'g28', level: 'B2', diagnostic: true, prompt: 'If I ___ earlier, I would have caught the train.', options: ['left', 'had left', 'have left', 'would leave'], answer: 1, explanation: 'Tercer condicional: if + past perfect, would have + participio.' },
  { id: 'g29', level: 'B2', diagnostic: true, prompt: 'By the time we arrived, the movie ___.', options: ['already started', 'has already started', 'had already started', 'was already starting'], answer: 2, explanation: 'Acción anterior a otra en el pasado: past perfect.' },
  { id: 'g30', level: 'B2', diagnostic: true, prompt: 'I wish I ___ to the party last night.', options: ['went', 'had gone', 'would go', 'have gone'], answer: 1, explanation: 'Lamento sobre el pasado: wish + past perfect.' },
  { id: 'g31', level: 'B2', diagnostic: true, prompt: 'She suggested ___ a break.', options: ['to take', 'taking', 'that we taking', 'take'], answer: 1, explanation: '"Suggest" + -ing (o "suggest that we take").' },
  { id: 'g32', level: 'B2', diagnostic: true, prompt: "You'd better ___ late again.", options: ['not be', "don't be", 'not to be', "won't be"], answer: 0, explanation: '"Had better" + verbo base; negativo: had better not + verbo.' },
  { id: 'g33', level: 'B2', diagnostic: false, prompt: 'He ___ have taken the bus; his car is still here.', options: ['must', 'can', 'should', 'would'], answer: 0, explanation: 'Deducción sobre el pasado: must have + participio.' },
  { id: 'g34', level: 'B2', diagnostic: false, prompt: 'The project, ___ started in May, is almost finished.', options: ['that', 'which', 'what', 'who'], answer: 1, explanation: 'Cláusula no restrictiva (entre comas): which, no that.' },
  { id: 'g35', level: 'B2', diagnostic: false, prompt: "I'd rather you ___ smoke in here.", options: ["don't", "didn't", "won't", 'not'], answer: 1, explanation: '"Would rather + persona" va con pasado.' },
  { id: 'g36', level: 'B2', diagnostic: false, prompt: 'She is ___ to get the job.', options: ['likely', 'probable', 'possible', 'maybe'], answer: 0, explanation: '"Be likely to" + verbo; "probable" no se usa así.' },
  // C1
  { id: 'g37', level: 'C1', diagnostic: true, prompt: 'Not only ___ late, but he also forgot the documents.', options: ['he arrived', 'did he arrive', 'he did arrive', 'arrived he'], answer: 1, explanation: 'Inversión tras "not only" al inicio: auxiliar + sujeto.' },
  { id: 'g38', level: 'C1', diagnostic: true, prompt: '___ I known about the problem, I would have helped.', options: ['If', 'Had', 'Have', 'Should'], answer: 1, explanation: 'Condicional con inversión: Had I known = If I had known.' },
  { id: 'g39', level: 'C1', diagnostic: true, prompt: 'It is essential that every employee ___ the training.', options: ['completes', 'complete', 'will complete', 'completed'], answer: 1, explanation: 'Subjuntivo tras "essential that": verbo base (formal, común en EE. UU.).' },
  { id: 'g40', level: 'C1', diagnostic: false, prompt: 'Hardly ___ sat down when the phone rang.', options: ['I had', 'had I', 'I have', 'did I'], answer: 1, explanation: 'Inversión tras "hardly": had + sujeto + participio.' },
  { id: 'g41', level: 'C1', diagnostic: false, prompt: 'The proposal was rejected, ___ surprised no one.', options: ['that', 'which', 'what', 'it'], answer: 1, explanation: '"Which" puede referirse a toda la oración anterior.' },
  { id: 'g42', level: 'C1', diagnostic: false, prompt: 'Little ___ that his life was about to change.', options: ['he knew', 'did he know', 'he did know', 'knew he'], answer: 1, explanation: 'Inversión tras "little" con sentido negativo.' },
];

// ---------- Lectura ----------

export interface ComprehensionQuestion {
  q: string;
  options: readonly string[];
  answer: number;
}

export interface Passage {
  id: string;
  level: CefrLevel;
  /** Formulario: 1 = diagnóstico; 2 = alternativo para re-evaluaciones. */
  form: 1 | 2;
  title: string;
  text: string;
  questions: readonly ComprehensionQuestion[];
}

export const READING_PASSAGES: readonly Passage[] = [
  {
    id: 'r-a2-1', level: 'A2', form: 1, title: 'A new job',
    text: "Hi Marta! I started my new job on Monday. The office is near my apartment, so I walk there every morning. My boss is very nice, and my coworkers are friendly. The only problem is lunch: there isn't a kitchen, so I have to buy food every day. It's expensive! Next week I'm going to bring sandwiches from home. Talk soon, Daniel.",
    questions: [
      { q: 'How does Daniel get to work?', options: ['By bus', 'He walks', 'By car', 'By train'], answer: 1 },
      { q: 'What is the problem with his job?', options: ['His boss', 'His coworkers', 'There is no kitchen', 'The office is far'], answer: 2 },
      { q: 'What will he do next week?', options: ['Bring food from home', 'Eat at a restaurant', 'Change jobs', 'Buy a kitchen'], answer: 0 },
    ],
  },
  {
    id: 'r-b1-1', level: 'B1', form: 1, title: 'Working from home',
    text: "Since the pandemic, many companies have allowed employees to work from home at least a few days a week. Most workers say they save time and money because they don't have to commute. However, some people feel lonely and find it hard to separate work from their personal life. Experts recommend having a fixed schedule, a dedicated workspace, and regular video calls with colleagues. Interestingly, a recent survey found that the majority of employees prefer a hybrid model rather than working from home every day.",
    questions: [
      { q: 'What is one advantage of working from home mentioned in the text?', options: ['Better salaries', 'Less time spent traveling', 'More meetings', 'Bigger offices'], answer: 1 },
      { q: 'What problem do some remote workers have?', options: ['They feel isolated', 'They work less', 'They lose their jobs', 'They travel too much'], answer: 0 },
      { q: 'According to the survey, most employees prefer…', options: ['working only from home', 'working only in the office', 'a mix of home and office', 'not working on Fridays'], answer: 2 },
    ],
  },
  {
    id: 'r-b2-1', level: 'B2', form: 1, title: 'The myth of multitasking',
    text: "Many of us take pride in our ability to multitask, answering emails while sitting in meetings or checking our phones while cooking. Yet research in cognitive psychology suggests that what we call multitasking is usually rapid task-switching, and each switch carries a cost. When we jump between activities, our brains need time to reorient, which can lead to more errors and, paradoxically, slower overall progress. People who consider themselves skilled multitaskers often perform worse on attention tests than those who rarely multitask. The practical lesson is not that we should never do two things at once, but that demanding tasks deserve our undivided attention.",
    questions: [
      { q: 'According to the text, multitasking is usually…', options: ['doing two things perfectly', 'switching quickly between tasks', 'a skill most people master', 'impossible for the brain'], answer: 1 },
      { q: 'What surprising finding is mentioned?', options: ['Heavy multitaskers often have worse attention', 'Multitasking makes us faster', 'Phones improve concentration', 'Meetings are useless'], answer: 0 },
      { q: "What is the author's main recommendation?", options: ['Never do two things at once', 'Give full attention to difficult tasks', 'Stop checking email', 'Train to multitask better'], answer: 1 },
    ],
  },
  {
    id: 'r-a2-2', level: 'A2', form: 2, title: 'Weekend plans',
    text: "This weekend my sister is visiting me from Valparaíso. On Saturday morning we're going to the market to buy fruit and vegetables. In the afternoon, we want to go to the park if the weather is good. If it rains, we'll watch a movie at home. On Sunday we have lunch with our parents. My mom always cooks too much food!",
    questions: [
      { q: 'Who is visiting this weekend?', options: ['A friend', 'The writer\'s sister', 'The parents', 'A coworker'], answer: 1 },
      { q: 'What will they do if it rains?', options: ['Go to the park', 'Go to the market', 'Watch a movie at home', 'Cook lunch'], answer: 2 },
      { q: 'What does the writer say about the mother?', options: ['She cooks a lot of food', 'She lives in Valparaíso', 'She doesn\'t cook', 'She is visiting'], answer: 0 },
    ],
  },
  {
    id: 'r-b1-2', level: 'B1', form: 2, title: 'Learning a language with apps',
    text: "Language apps have become extremely popular because they are cheap, convenient, and fun. Short daily lessons help users build a habit, and many apps send reminders so people don't forget to practice. However, teachers point out that apps alone rarely lead to fluency. Most exercises focus on recognizing words rather than producing real sentences, and learners get few opportunities to have actual conversations. The best results usually come from combining apps with speaking practice, reading, and plenty of listening.",
    questions: [
      { q: 'Why are language apps popular?', options: ['They guarantee fluency', 'They are affordable and convenient', 'They replace teachers', 'They are long'], answer: 1 },
      { q: 'What is a weakness of many apps?', options: ['They are expensive', 'They have too much speaking', 'They focus on recognition more than production', 'They are boring'], answer: 2 },
      { q: 'What do teachers recommend?', options: ['Using only apps', 'Stopping apps', 'Combining apps with other practice', 'Studying grammar only'], answer: 2 },
    ],
  },
  {
    id: 'r-b2-2', level: 'B2', form: 2, title: 'Why we procrastinate',
    text: "Procrastination is often dismissed as laziness, but psychologists increasingly describe it as a problem of emotion regulation rather than time management. We tend to delay tasks that make us feel anxious, bored, or insecure, choosing short-term relief over long-term benefit. Ironically, the relief is temporary: the unfinished task keeps generating stress in the background. Strategies that target the emotional side—such as breaking a task into a tiny first step or forgiving yourself for past delays—have been shown to be surprisingly effective, whereas simply buying a new planner rarely solves the underlying issue.",
    questions: [
      { q: 'How do psychologists increasingly see procrastination?', options: ['As laziness', 'As an emotional problem', 'As a lack of planners', 'As a medical disease'], answer: 1 },
      { q: 'Why is the relief from procrastinating described as ironic?', options: ['It lasts forever', 'The stress continues anyway', 'It makes tasks easier', 'It improves time management'], answer: 1 },
      { q: 'Which strategy is described as effective?', options: ['Buying a planner', 'Working longer hours', 'Starting with a very small step', 'Avoiding difficult tasks'], answer: 2 },
    ],
  },
];

// ---------- Listening (texto leído con voz sintética) ----------

export const LISTENING_PASSAGES: readonly Passage[] = [
  {
    id: 'l-a2-1', level: 'A2', form: 1, title: 'At the café',
    text: "Hi, can I get a medium latte and a chocolate muffin, please? Oh, and can you make the latte with oat milk? Thanks. It's for here, not to go. How much is that? Eight fifty? Okay, I'll pay by card.",
    questions: [
      { q: 'What does the customer order?', options: ['A small coffee and a cookie', 'A medium latte and a muffin', 'A tea and a sandwich', 'A large latte only'], answer: 1 },
      { q: 'Where will the customer eat?', options: ['At the café', 'At home', 'At the office', 'In the car'], answer: 0 },
      { q: 'How does the customer pay?', options: ['In cash', 'By card', 'With a phone app', 'They don\'t pay'], answer: 1 },
    ],
  },
  {
    id: 'l-b1-1', level: 'B1', form: 1, title: 'A voicemail',
    text: "Hey Chris, it's Sam. I'm calling about tomorrow's meeting. The client asked to move it from ten to eleven thirty, so we've got a bit more time to finish the slides. Could you send me the updated numbers by nine? I want to double-check them before we go in. Oh, and the meeting's in the small conference room now, not the big one. Call me back if there's any problem. Thanks!",
    questions: [
      { q: 'What time is the meeting now?', options: ['9:00', '10:00', '11:30', '12:30'], answer: 2 },
      { q: 'What does Sam need by nine?', options: ['The slides', 'The updated numbers', 'A conference room', 'A call from the client'], answer: 1 },
      { q: 'What else changed?', options: ['The client', 'The room', 'The day', 'The topic'], answer: 1 },
    ],
  },
  {
    id: 'l-b2-1', level: 'B2', form: 1, title: 'A podcast intro',
    text: "Welcome back to the show. Today we're tackling something that a lot of you have written in about: burnout. Now, it's not just about being tired after a long week. Burnout tends to creep up on you slowly, and by the time you notice it, you've often been running on empty for months. We'll be talking to a workplace psychologist about the early warning signs, and, more importantly, what you can realistically do about it when quitting your job isn't an option.",
    questions: [
      { q: 'Why did the host choose this topic?', options: ['Listeners asked about it', 'It is in the news', 'The host is burned out', 'A company paid for it'], answer: 0 },
      { q: 'According to the host, burnout usually…', options: ['appears suddenly', 'develops gradually', 'lasts one week', 'only affects managers'], answer: 1 },
      { q: 'What will the episode focus on?', options: ['How to quit your job', 'Practical steps when you can\'t quit', 'Sleep problems', 'Salary negotiation'], answer: 1 },
    ],
  },
  {
    id: 'l-a2-2', level: 'A2', form: 2, title: 'At the train station',
    text: "Attention, please. The train to the airport is now leaving from platform three, not platform five. The train is ten minutes late. We are sorry for the delay. Tickets are available from the machines near the entrance.",
    questions: [
      { q: 'Where does the airport train leave from now?', options: ['Platform three', 'Platform five', 'Platform ten', 'The entrance'], answer: 0 },
      { q: 'How late is the train?', options: ['Five minutes', 'Ten minutes', 'Three minutes', 'It is on time'], answer: 1 },
      { q: 'Where can you buy tickets?', options: ['On the train', 'At the airport', 'From machines near the entrance', 'Online only'], answer: 2 },
    ],
  },
  {
    id: 'l-b1-2', level: 'B1', form: 2, title: 'Tech support',
    text: "Okay, so I understand your laptop won't connect to the Wi-Fi. First, let's try something simple. Can you turn the Wi-Fi off and on again? It's the icon in the bottom right corner. Did that work? No? All right, then I'm going to ask you to restart the laptop. If it still doesn't connect after that, I'll send a technician tomorrow morning, between eight and noon.",
    questions: [
      { q: 'What is the problem?', options: ['The screen is broken', 'The laptop can\'t connect to Wi-Fi', 'The battery is dead', 'The keyboard doesn\'t work'], answer: 1 },
      { q: 'What is the second thing the agent asks?', options: ['Buy a new laptop', 'Restart the laptop', 'Call tomorrow', 'Check the cable'], answer: 1 },
      { q: 'When could a technician come?', options: ['Tonight', 'Tomorrow morning', 'Tomorrow afternoon', 'Next week'], answer: 1 },
    ],
  },
  {
    id: 'l-b2-2', level: 'B2', form: 2, title: 'A meeting update',
    text: "Quick update before we wrap up. The good news is that the beta launched on schedule and early feedback has been largely positive. The not-so-good news is that onboarding is taking users longer than we anticipated, so a lot of people are dropping off before they actually get to the core features. Rather than adding anything new this sprint, I'd like us to focus on streamlining that first-time experience. Let's reconvene on Thursday with some concrete proposals.",
    questions: [
      { q: 'How was the early feedback?', options: ['Mostly negative', 'Mostly positive', 'There was none', 'Mixed and confusing'], answer: 1 },
      { q: 'What problem is mentioned?', options: ['The launch was late', 'New users take too long to get started', 'The features are broken', 'The team is too small'], answer: 1 },
      { q: 'What does the speaker want to do this sprint?', options: ['Add new features', 'Simplify the first-time experience', 'Cancel the beta', 'Hire more people'], answer: 1 },
    ],
  },
];

// ---------- Dictado (voz sintética) ----------

export interface DictationItem {
  id: string;
  level: CefrLevel;
  form: 1 | 2;
  text: string;
}

export const DICTATION_ITEMS: readonly DictationItem[] = [
  { id: 'd1', level: 'A1', form: 1, text: 'I live in a small apartment.' },
  { id: 'd2', level: 'A2', form: 1, text: "We're going to have lunch at one." },
  { id: 'd3', level: 'B1', form: 1, text: "I've been working here for about two years." },
  { id: 'd4', level: 'B2', form: 1, text: "If I'd known about it, I would've told you." },
  { id: 'd5', level: 'A1', form: 2, text: 'My sister has two cats.' },
  { id: 'd6', level: 'A2', form: 2, text: 'Can you tell me where the bank is?' },
  { id: 'd7', level: 'B1', form: 2, text: "I'm not sure what time the meeting starts." },
  { id: 'd8', level: 'B2', form: 2, text: "She must've left before we got there." },
];

// ---------- Expresión oral ----------

export interface ReadAloudItem {
  id: string;
  level: CefrLevel;
  form: 1 | 2;
  text: string;
}

export const READ_ALOUD_ITEMS: readonly ReadAloudItem[] = [
  { id: 's1', level: 'A1', form: 1, text: 'I think this is a very good idea.' },
  { id: 's2', level: 'A2', form: 1, text: 'She works three days a week from home.' },
  { id: 's3', level: 'B1', form: 1, text: 'We should check the results before the meeting.' },
  { id: 's4', level: 'B2', form: 1, text: 'I think they thought about it on Thursday.' },
  { id: 's5', level: 'A1', form: 2, text: 'The sheep is on the ship.' },
  { id: 's6', level: 'A2', form: 2, text: 'I would like a bottle of water, please.' },
  { id: 's7', level: 'B1', form: 2, text: 'He very rarely visits his relatives in the village.' },
  { id: 's8', level: 'B2', form: 2, text: 'Unfortunately, the schedule changed at the last minute.' },
];

export const SPEAKING_PROMPTS: Record<1 | 2, string> = {
  1: 'Describe your typical day: what you do in the morning, at work or school, and in the evening.',
  2: 'Talk about a trip or an important event in your life. What happened? How did you feel?',
};

export const WRITING_PROMPTS: Record<1 | 2, string> = {
  1: 'Write an email (80–120 words) to a friend. Tell them about your job or studies and your plans for next month.',
  2: 'Write a short message (80–120 words) to a coworker. Explain a problem you had this week and propose a solution.',
};

export interface RubricCriterion {
  id: string;
  label: string;
  /** Descriptor por nivel 1..5 (1 ≈ A1, 3 ≈ B1, 5 ≈ C1). */
  levels: readonly [string, string, string, string, string];
}

export const SPEAKING_RUBRIC: readonly RubricCriterion[] = [
  { id: 'fluency', label: 'Fluidez', levels: ['Palabras sueltas, pausas muy largas', 'Frases cortas, me detengo seguido', 'Hablo de forma continua con algunas pausas', 'Hablo con fluidez; pocas pausas para buscar palabras', 'Fluido y natural casi siempre'] },
  { id: 'accuracy', label: 'Precisión gramatical', levels: ['Muchos errores básicos', 'Errores frecuentes, pero se entiende', 'Errores en estructuras complejas', 'Pocos errores; me corrijo solo', 'Errores raros'] },
  { id: 'range', label: 'Vocabulario', levels: ['Solo palabras muy básicas', 'Vocabulario de temas cotidianos', 'Suficiente para temas conocidos', 'Variado; parafraseo cuando no sé una palabra', 'Amplio y preciso, incluye expresiones idiomáticas'] },
  { id: 'pronunciation', label: 'Pronunciación', levels: ['Difícil de entender', 'Se entiende con esfuerzo', 'Se entiende; acento marcado', 'Clara; algunos sonidos difíciles', 'Muy clara y natural'] },
];

export const WRITING_RUBRIC: readonly RubricCriterion[] = [
  { id: 'task', label: 'Cumplimiento de la tarea', levels: ['No cumple la tarea', 'Cumple en parte, ideas muy simples', 'Cumple la tarea con ideas claras', 'Cumple bien, con detalles y ejemplos', 'Cumple de forma completa y convincente'] },
  { id: 'grammar', label: 'Gramática', levels: ['Muchos errores básicos', 'Errores frecuentes en tiempos verbales', 'Algunos errores en estructuras complejas', 'Pocos errores', 'Prácticamente sin errores'] },
  { id: 'vocabulary', label: 'Vocabulario', levels: ['Muy limitado', 'Básico y repetitivo', 'Adecuado al tema', 'Variado y preciso', 'Amplio, natural e idiomático'] },
  { id: 'coherence', label: 'Organización', levels: ['Ideas sueltas', 'Ideas unidas con "and/but"', 'Párrafos y conectores básicos', 'Bien organizado; conectores variados', 'Fluye de forma natural'] },
];
