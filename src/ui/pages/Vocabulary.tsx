import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../../db/db';
import { setKnown } from '../../db/repo';
import { NGSL } from '../../content/vocab.generated';
import { isMastered, State } from '../../domain/srs';
import { SpeakButton } from '../components/Audio';

const PAGE = 50;

export function VocabularyPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const cards = useLiveQuery(() => db.cards.toArray(), []);
  const byRef = useMemo(() => new Map((cards ?? []).map((c) => [c.ref, c])), [cards]);
  const q = query.trim().toLowerCase();
  const filtered = NGSL.filter((r) => q === '' || r[0].startsWith(q) || (r[2]?.toLowerCase().includes(q) ?? false));
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="stack">
      <h1>Vocabulario NGSL</h1>
      <p className="small">Las 2.809 palabras más útiles del inglés general, ordenadas por frecuencia. Por ahora, las primeras 1.000 tienen traducción y tarjeta (generadas, a verificar); el resto se agrega en las próximas fases.</p>
      <label htmlFor="q" className="sr-only">Buscar</label>
      <input id="q" type="text" placeholder="Buscar en inglés o español…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
      <div className="card">
        {slice.map(([lemma, rank, es, ex]) => {
          const card = byRef.get(lemma);
          let status = 'sin tarjeta';
          if (card) status = card.known === 1 ? 'conocida' : isMastered(card) ? 'dominada' : card.state === State.New ? 'nueva' : 'en estudio';
          return (
            <div key={lemma} className="vocab-row">
              <span className="small muted" style={{ minWidth: '2.5rem' }}>#{rank}</span>
              <div className="grow">
                <div className="lemma" lang="en">{lemma}</div>
                {es && <div className="small">{es}</div>}
                {ex && <div className="small muted" lang="en">{ex}</div>}
              </div>
              <div className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
                <span className="badge">{status}</span>
                <SpeakButton text={lemma} label="▶" />
                {card && (
                  <button type="button" className="btn ghost small" onClick={() => { void setKnown(db, card.id, card.known !== 1); }}>
                    {card.known === 1 ? 'Estudiar' : 'Ya la sé'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {slice.length === 0 && <p className="small">Sin resultados.</p>}
      </div>
      <div className="row between">
        <button type="button" className="btn small" disabled={page === 0} onClick={() => { setPage((p) => p - 1); }}>Anterior</button>
        <span className="small">{filtered.length === 0 ? 0 : page * PAGE + 1}–{Math.min(filtered.length, (page + 1) * PAGE)} de {filtered.length}</span>
        <button type="button" className="btn small" disabled={(page + 1) * PAGE >= filtered.length} onClick={() => { setPage((p) => p + 1); }}>Siguiente</button>
      </div>
    </div>
  );
}
