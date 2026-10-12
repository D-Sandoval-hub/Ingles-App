import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDB } from './db';
import { applyReview, dueCount, ensureDeck, getSettings, introducedOn, setKnown, updateSettings } from './repo';
import { BackupError, exportBackup, importBackup, parseBackup } from './backup';
import { Rating, State } from '../domain/srs';
import { dayKey } from '../domain/time';

const dbs: AppDB[] = [];
function freshDb() {
  const d = new AppDB(`test-${crypto.randomUUID()}`);
  dbs.push(d);
  return d;
}
afterEach(async () => {
  for (const d of dbs.splice(0)) await d.delete();
});

const NOW = new Date('2026-10-12T10:00:00').getTime();

describe('repositorio', () => {
  it('crea ajustes por defecto', async () => {
    const d = freshDb();
    const s = await getSettings(d);
    expect(s.startDate).toBeNull();
    expect(s.srs.newPerDay).toBe(25);
    const u = await updateSettings(d, { startDate: '2026-10-12' });
    expect(u.startDate).toBe('2026-10-12');
  });

  it('ensureDeck crea 1000 tarjetas, es idempotente y marca conocidas bajo el rango', async () => {
    const d = freshDb();
    expect(await ensureDeck(d, NOW, 501)).toBe(1000);
    expect(await ensureDeck(d, NOW, 501)).toBe(0);
    expect(await d.cards.where('known').equals(1).count()).toBe(500);
    const the = await d.cards.get('w:the');
    expect(the?.known).toBe(1);
  });

  it('repasar guarda la tarjeta y el registro; cuenta nuevas del día y vencidas', async () => {
    const d = freshDb();
    await ensureDeck(d, NOW);
    const card = await d.cards.get('w:idea');
    if (!card) throw new Error('falta tarjeta');
    const next = await applyReview(d, { card, rating: Rating.Good, now: NOW, durationMs: 4000 });
    expect(next.state).not.toBe(State.New);
    expect(await d.reviewLogs.count()).toBe(1);
    expect(await introducedOn(d, dayKey(new Date(NOW)))).toBe(1);
    expect(await dueCount(d, NOW + 3_600_000)).toBe(1);
    await setKnown(d, 'w:idea', true);
    expect(await dueCount(d, NOW + 3_600_000)).toBe(0);
  });
});

describe('respaldo', () => {
  it('exporta e importa sin pérdida', async () => {
    const a = freshDb();
    await updateSettings(a, { startDate: '2026-10-01' });
    await ensureDeck(a, NOW);
    const card = await a.cards.get('w:time');
    if (!card) throw new Error('falta tarjeta');
    await applyReview(a, { card, rating: Rating.Easy, now: NOW, durationMs: 1000 });
    const json = JSON.stringify(await exportBackup(a));

    const b = freshDb();
    await importBackup(b, parseBackup(json));
    expect(await b.cards.count()).toBe(1000);
    expect((await b.cards.get('w:time'))?.reps).toBe(1);
    expect((await getSettings(b)).startDate).toBe('2026-10-01');
  });

  it('rechaza archivos inválidos sin tocar la base', () => {
    expect(() => parseBackup('no es json')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ app: 'otra' }))).toThrow(BackupError);
    const bad = { app: 'ingles-app', version: 1, exportedAt: 1, settings: [], cards: [{ id: 'x' }], reviewLogs: [], sessions: [], assessments: [], errorEvents: [], dayChoices: [] };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/cards/);
  });
});
