import { describe, it, expect } from 'vitest';
import { FLOOR, HEAT_MODES, heatFarms, heatNote, heatGradient, heatRadius, heatColor } from './heatmap';

const farm = (id, extra = {}) => ({ id, name: `F${id}`, lat: 7.3, lng: 125.6, area: 1, barangay: '', floodRisk: '', yieldTHa: null, ...extra });

describe('heatmap', () => {
  it('leaves farms without a harvest off the yield view instead of showing them as low yield', () => {
    const farms = [farm(1, { yieldTHa: 3.5 }), farm(2), farm(3, { yieldTHa: 0 })];
    const shown = heatFarms(farms, 'yield');
    expect(shown.map(p => p.farm.id)).toEqual([1, 3]);
    expect(shown[0].weight).toBeCloseTo(FLOOR + (1 - FLOOR) * 0.5);
    expect(shown[1].weight).toBe(FLOOR);   // a real 0 t/ha still shows, in the "low" colour
    expect(heatNote(farms, 'yield')).toBe('2 of 3 farms have a harvest recorded. Farms without one are not shown.');
  });

  it('leaves farms never scanned off the flood view, and reads the scan\'s High/Low', () => {
    const farms = [farm(1, { floodRisk: 'High' }), farm(2, { floodRisk: 'Low' }), farm(3)];
    expect(heatFarms(farms, 'flood').map(p => [p.farm.id, p.weight])).toEqual([[1, 1], [2, FLOOR]]);
    expect(heatNote(farms, 'flood')).toMatch(/^2 of 3 farms/);
  });

  it('says "1 of 7 farms has", not "have"', () => {
    const farms = [farm(1, { yieldTHa: 2 }), farm(2), farm(3)];
    expect(heatNote(farms, 'yield')).toBe('1 of 3 farms has a harvest recorded. Farms without one are not shown.');
  });

  it('counts every farm for density and needs no note', () => {
    const farms = [farm(1), farm(2)];
    expect(heatFarms(farms, 'density')).toHaveLength(2);
    expect(heatNote(farms, 'density')).toBe('');
  });

  it('starts the colours at the floor so the weakest farm is still the "low" colour', () => {
    expect(Object.keys(heatGradient('yield')).map(Number).sort()).toEqual([FLOOR, (FLOOR + 1) / 2, 1]);
  });

  it('gives yield and flood farms their own colour, so neighbours are not added together', () => {
    expect(HEAT_MODES.density.blend).toBe(true);
    expect(HEAT_MODES.yield.blend).toBeFalsy();
    expect(HEAT_MODES.flood.blend).toBeFalsy();
    const [low, mid, high] = HEAT_MODES.flood.colors.map(c => c.toLowerCase());
    expect([heatColor('flood', 0), heatColor('flood', 0.5), heatColor('flood', 1)]).toEqual([low, mid, high]);
  });

  it('grows the blobs as you zoom in, within limits', () => {
    expect(heatRadius(11)).toBe(25);
    expect(heatRadius(14)).toBeGreaterThan(heatRadius(13));
    expect(heatRadius(18)).toBe(90);
  });
});
