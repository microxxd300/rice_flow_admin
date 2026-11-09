import { describe, it, expect } from 'vitest';
import { factorPic, ecosystemPic, emptyPic } from './pictures';

describe('pictures', () => {
  it('has an icon for each of the 12 rule factors', () => {
    for (const k of ['soil_ph', 'soil_texture', 'organic_matter', 'drainage', 'avg_temperature', 'seasonal_rainfall',
      'humidity', 'solar_radiation', 'temp_at_flowering', 'elevation', 'slope', 'stress_tolerance']) {
      expect(factorPic(k)).toBeTruthy();
    }
    expect(factorPic('nope')).toBeNull();
  });
  it('reads an ecosystem written with an underscore or a space', () => {
    expect(ecosystemPic('rainfed_lowland')).toBe(ecosystemPic('rainfed lowland'));
    expect(ecosystemPic('upland')).toBeTruthy();
    expect(ecosystemPic('')).toBeNull();
  });
  it('has a picture for each import result and none for anything else', () => {
    expect(emptyPic('import_done')).toBeTruthy();
    expect(emptyPic('import_failed')).toBeTruthy();
    expect(emptyPic('x')).toBeNull();
  });
});
