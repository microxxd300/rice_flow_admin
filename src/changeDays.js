/**
 * The change log's day groups, newest first: "Today", "Yesterday", then the date
 * ("Mon, Nov 3"). Rows keep their order inside a day.
 */
export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  const start = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

export function groupByDay(rows, now = new Date()) {
  const groups = [];
  for (const r of rows) {
    const label = dayLabel(r.created_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groups.push({ label, rows: [r] });
  }
  return groups;
}
