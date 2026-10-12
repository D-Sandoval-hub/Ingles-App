import type { CefrLevel } from '../domain/types';

/**
 * Recursos externos reales. La app NO reproduce su contenido: solo enlaza.
 * Para no inventar URLs de páginas internas, se usan los sitios principales
 * o búsquedas en YouTube. La disponibilidad de transcripciones y de series
 * en plataformas de streaming cambia: verifícala tú.
 */
export interface Resource {
  id: string;
  title: string;
  kind: 'podcast' | 'youtube' | 'web' | 'serie';
  accent: 'EE. UU.' | 'Reino Unido' | 'Varios';
  levels: readonly CefrLevel[];
  description: string;
  url: string;
  transcripts: 'sí' | 'a veces' | 'no' | 'verificar';
}

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const RESOURCES: readonly Resource[] = [
  { id: 'voa', title: 'VOA Learning English', kind: 'web', accent: 'EE. UU.', levels: ['A1', 'A2', 'B1'], description: 'Noticias y lecciones leídas despacio, con texto.', url: 'https://learningenglish.voanews.com/', transcripts: 'sí' },
  { id: 'bbcle', title: 'BBC Learning English', kind: 'web', accent: 'Reino Unido', levels: ['A2', 'B1', 'B2'], description: 'Programas cortos (p. ej. 6 Minute English) con transcripción.', url: 'https://www.bbc.co.uk/learningenglish/', transcripts: 'sí' },
  { id: 'easyenglish', title: 'Easy English (Easy Languages)', kind: 'youtube', accent: 'Varios', levels: ['A2', 'B1'], description: 'Entrevistas en la calle con subtítulos en inglés.', url: yt('Easy English street interviews'), transcripts: 'a veces' },
  { id: 'rachels', title: "Rachel's English", kind: 'youtube', accent: 'EE. UU.', levels: ['A2', 'B1', 'B2'], description: 'Pronunciación americana, habla conectada y reducciones.', url: yt("Rachel's English"), transcripts: 'no' },
  { id: 'vanessa', title: 'Speak English with Vanessa', kind: 'youtube', accent: 'EE. UU.', levels: ['A2', 'B1'], description: 'Inglés conversacional, expresiones del día a día.', url: yt('Speak English with Vanessa'), transcripts: 'verificar' },
  { id: 'allears', title: 'All Ears English', kind: 'podcast', accent: 'EE. UU.', levels: ['B1', 'B2'], description: 'Podcast de conversación natural entre hablantes nativos.', url: yt('All Ears English podcast'), transcripts: 'verificar' },
  { id: 'teded', title: 'TED-Ed', kind: 'youtube', accent: 'Varios', levels: ['B1', 'B2'], description: 'Videos animados de 5 min sobre ciencia e historia.', url: yt('TED-Ed'), transcripts: 'sí' },
  { id: 'ted', title: 'TED Talks', kind: 'youtube', accent: 'Varios', levels: ['B2', 'C1'], description: 'Charlas de 10–20 min; transcripción interactiva en ted.com.', url: 'https://www.ted.com/talks', transcripts: 'sí' },
  { id: 'tal', title: 'This American Life', kind: 'podcast', accent: 'EE. UU.', levels: ['B2', 'C1'], description: 'Historias reales, habla nativa natural. Publica transcripciones.', url: 'https://www.thisamericanlife.org/', transcripts: 'sí' },
  { id: 'planetmoney', title: 'Planet Money (NPR)', kind: 'podcast', accent: 'EE. UU.', levels: ['B2', 'C1'], description: 'Economía explicada con historias, ritmo rápido.', url: 'https://www.npr.org/podcasts/510289/planet-money', transcripts: 'a veces' },
  { id: 'friends', title: 'Friends (serie)', kind: 'serie', accent: 'EE. UU.', levels: ['B1', 'B2'], description: 'Diálogos cotidianos. Úsala con subtítulos en inglés.', url: yt('Friends best scenes'), transcripts: 'no' },
  { id: 'modernfamily', title: 'Modern Family (serie)', kind: 'serie', accent: 'EE. UU.', levels: ['B2', 'C1'], description: 'Humor y habla rápida; buena para reducciones.', url: yt('Modern Family scenes'), transcripts: 'no' },
];

export function resourcesForLevel(level: CefrLevel | 'Pre-A1'): Resource[] {
  const target: CefrLevel = level === 'Pre-A1' ? 'A1' : level;
  const exact = RESOURCES.filter((r) => r.levels.includes(target));
  return exact.length > 0 ? exact : [...RESOURCES];
}
