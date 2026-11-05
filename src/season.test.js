import { describe, it, expect } from 'vitest';
import { seasonOf, seasonProgress } from './season';

describe('seasonOf', () => {
  it('names the wet season by its year', () => {
    expect(seasonOf(new Date(2026, 6, 10)).label).toBe('Wet Season 2026');
  });
  it('names the dry season by both years, in November and in March', () => {
    expect(seasonOf(new Date(2026, 10, 5)).label).toBe('Dry Season 2026-27');
    expect(seasonOf(new Date(2027, 2, 1)).label).toBe('Dry Season 2026-27');
  });
});

describe('seasonProgress', () => {
  it('counts the first days as week 1', () => {
    expect(seasonProgress(new Date(2026, 10, 5)).week).toBe(1);
    expect(seasonProgress(new Date(2026, 10, 8)).week).toBe(2);
  });
  it('is near the end at the end of April', () => {
    expect(seasonProgress(new Date(2027, 3, 30)).share).toBe(1);
  });
});
