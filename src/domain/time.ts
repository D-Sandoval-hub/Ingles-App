const MS_PER_DAY = 86_400_000;

/** Clave de día local 'YYYY-MM-DD' según la zona horaria del dispositivo. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convierte 'YYYY-MM-DD' a la medianoche local de ese día. */
export function parseDayKey(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Clave de día inválida: ${key}`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Días calendario entre dos claves (b - a). Robusto ante cambios de horario de verano. */
export function daysBetween(a: string, b: string): number {
  const da = parseDayKey(a);
  const db = parseDayKey(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Número de día del programa (1 = día de inicio). */
export function programDay(startKey: string, todayKey: string): number {
  return daysBetween(startKey, todayKey) + 1;
}
