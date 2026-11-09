import { describe, expect, it } from 'vitest';
import { cycleStage, normalizeStage } from './stageGroups';

describe('cycleStage', () => {
  it('gives a crop not sown yet no column', () => {
    expect(cycleStage(null, null)).toBe('');
  });

  it('gives a sown crop its column', () => {
    expect(cycleStage('Tillering', 3)).toBe('Vegetative');
  });
});

describe('normalizeStage', () => {
  it('puts every backend growth stage in its column by number', () => {
    const names = ['Germination & Seedling', 'Seedling Stage', 'Tillering', 'Stem Elongation', 'Booting',
      'Heading / Flowering', 'Grain Filling', 'Ripening / Maturity', 'Harvesting', 'Post-Harvest'];
    expect(names.map((name, i) => normalizeStage(name, i + 1))).toEqual([
      'Land Prep', 'Planting', 'Vegetative', 'Vegetative', 'Reproductive',
      'Reproductive', 'Reproductive', 'Harvesting', 'Harvesting', 'Harvesting',
    ]);
  });

  it('falls back to the name when there is no stage number', () => {
    expect(normalizeStage('Tillering')).toBe('Vegetative');
    expect(normalizeStage(null)).toBe('Land Prep');
  });
});
