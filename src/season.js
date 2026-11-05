/**
 * The cropping season, the same rule as the app and the server (guides/sowing.py):
 * Wet Season May–October, Dry Season November–April (named for both years it spans).
 */
export function seasonOf(d = new Date()) {
  const m = d.getMonth();           // 0 = January
  const y = d.getFullYear();
  if (m >= 4 && m <= 9) {
    return { kind: 'wet', label: `Wet Season ${y}`, start: new Date(y, 4, 1), end: new Date(y, 9, 31) };
  }
  const startYear = m >= 10 ? y : y - 1;
  return {
    kind: 'dry',
    label: `Dry Season ${startYear}-${String(startYear + 1).slice(2)}`,
    start: new Date(startYear, 10, 1),
    end: new Date(startYear + 1, 3, 30),
  };
}

/** Week of the season (1 on its first day) and how much of it has passed (0..1). */
export function seasonProgress(d = new Date()) {
  const s = seasonOf(d);
  const day = Math.floor((d - s.start) / 86400000);
  const total = Math.round((s.end - s.start) / 86400000) + 1;
  return { ...s, week: Math.floor(day / 7) + 1, share: Math.min(1, Math.max(0, (day + 1) / total)) };
}
