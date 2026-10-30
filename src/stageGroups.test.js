import { describe, expect, it } from 'vitest';
import { normalizeStage } from './stageGroups';

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
