// Pure local-date helpers (YYYY-MM-DD strings, no timezone drift).

export function parseDateKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map((p) => Number(p));
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

export function toDateKey(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const mm = `${dt.getUTCMonth() + 1}`.padStart(2, "0");
  const dd = `${dt.getUTCDate()}`.padStart(2, "0");
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

export function addDaysKey(key: string, days: number): string {
  const { y, m, d } = parseDateKey(key);
  return toDateKey(y, m, d + days);
}

export function diffDaysKey(from: string, to: string): number {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  return Math.round(
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000,
  );
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: string): number {
  const { y, m, d } = parseDateKey(key);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
