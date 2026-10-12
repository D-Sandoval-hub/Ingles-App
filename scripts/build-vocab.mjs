// Genera src/content/vocab.generated.ts a partir de la NGSL 1.2 (CC BY-SA 4.0)
// y de las traducciones/ejemplos en content-src/glosses_*.txt (generados, "a verificar").
// Uso: node scripts/build-vocab.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const csv = readFileSync(join(root, 'content-src/ngsl_1.2_stats.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
const lemmas = csv.map((line, i) => {
  const raw = line.split(',')[0]?.trim() ?? '';
  const lemma = raw === 'I' ? 'I' : raw.toLowerCase(); // el CSV trae "TRUE" (artefacto de Excel)
  return { lemma, rank: i + 1 };
});

const glossFiles = readdirSync(join(root, 'content-src')).filter((f) => /^glosses_\d+\.txt$/.test(f)).sort();
const glosses = new Map();
for (const file of glossFiles) {
  for (const line of readFileSync(join(root, 'content-src', file), 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split('|');
    if (parts.length !== 3) throw new Error(`${file}: línea mal formada: ${line}`);
    const [lemma, es, ex] = parts.map((p) => p.trim());
    if (glosses.has(lemma)) throw new Error(`${file}: duplicado: ${lemma}`);
    glosses.set(lemma, { es, ex });
  }
}
const known = new Set(lemmas.map((l) => l.lemma));
for (const g of glosses.keys()) if (!known.has(g)) throw new Error(`Glosa sin lema NGSL: ${g}`);

const rows = lemmas.map(({ lemma, rank }) => {
  const g = glosses.get(lemma);
  return g ? [lemma, rank, g.es, g.ex] : [lemma, rank];
});
const withGloss = rows.filter((r) => r.length === 4).length;
const out = `// ARCHIVO GENERADO por scripts/build-vocab.mjs — no editar a mano.
// Lista: New General Service List 1.2 (Browne, Culligan & Phillips), CC BY-SA 4.0,
// https://www.newgeneralservicelist.com/ — Traducciones y ejemplos: generados, pendientes de verificación.
// ${rows.length} lemas; ${withGloss} con traducción y ejemplo.
export type VocabRow = readonly [lemma: string, rank: number, es?: string, example?: string];
export const NGSL: readonly VocabRow[] = ${JSON.stringify(rows)};
`;
writeFileSync(join(root, 'src/content/vocab.generated.ts'), out);
console.log(`OK: ${rows.length} lemas, ${withGloss} con glosa.`);
