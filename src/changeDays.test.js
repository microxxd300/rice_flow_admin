import { describe, it, expect } from 'vitest';
import { dayLabel, groupByDay } from './changeDays';

const now = new Date(2026, 10, 5, 9, 0);

describe('dayLabel', () => {
  it('says Today and Yesterday by the calendar day, not 24 hours', () => {
    expect(dayLabel(new Date(2026, 10, 5, 0, 5).toISOString(), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 10, 4, 23, 50).toISOString(), now)).toBe('Yesterday');
  });
  it('names older days by their date', () => {
    expect(dayLabel(new Date(2026, 10, 2, 12).toISOString(), now)).toBe('Mon, Nov 2');
  });
});

describe('groupByDay', () => {
  it('keeps the order and starts a group on each new day', () => {
    const rows = [
      { id: 1, created_at: new Date(2026, 10, 5, 8).toISOString() },
      { id: 2, created_at: new Date(2026, 10, 5, 7).toISOString() },
      { id: 3, created_at: new Date(2026, 10, 3, 7).toISOString() },
    ];
    const g = groupByDay(rows, now);
    expect(g.map(x => x.label)).toEqual(['Today', 'Tue, Nov 3']);
    expect(g[0].rows.map(r => r.id)).toEqual([1, 2]);
  });
});
