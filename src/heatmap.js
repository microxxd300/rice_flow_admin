/**
 * The Farm Map's heatmap rules, kept apart from the page so they can be tested.
 *
 * leaflet.heat colours a blob by how strong it is, and a weak blob is also faint.
 * So every farm's value (0..1) is lifted to FLOOR..1: the lowest value still shows,
 * in the legend's "low" colour, instead of fading away.
 */
export const FLOOR = 0.5;

const FLOOD_LEVEL = { low: 0, moderate: 0.5, high: 1 };
const YIELD_TOP = 7;      // t/ha shown as the top colour (a very good harvest)

export const HEAT_MODES = {
  density: {
    label: 'Farm Density',
    desc: 'Where farms are close together',
    // every farm counts at the "low" strength; farms close together add up toward "high"
    blend: true,
    value: () => 0,
    low: '1 farm', high: 'Many farms close together',
    colors: ['#22C55E', '#F59E0B', '#DC2626'],
    tip: (f) => `${f.area.toFixed(2)} ha${f.barangay ? ` · ${f.barangay}` : ''}`,
  },
  yield: {
    label: 'Avg Yield',
    desc: 'Last recorded harvest, in tonnes per hectare',
    // a farm with no harvest recorded is left out: no data is not a low yield
    value: (f) => (f.yieldTHa == null || f.yieldTHa === '' || isNaN(Number(f.yieldTHa)))
      ? null
      : Math.min(1, Math.max(0, Number(f.yieldTHa) / YIELD_TOP)),
    low: '0 t/ha', high: `${YIELD_TOP}+ t/ha`,
    colors: ['#FACC15', '#65A30D', '#166534'],
    tip: (f) => `Last harvest: ${Number(f.yieldTHa).toFixed(1)} t/ha`,
    missing: (n, total) => `${n} of ${total} farms have a harvest recorded. Farms without one are not shown.`,
  },
  flood: {
    label: 'Flood Risk',
    desc: 'From each farm\'s latest environmental scan',
    // a farm never scanned is left out: no scan is not a low risk
    value: (f) => FLOOD_LEVEL[(f.floodRisk || '').toLowerCase()] ?? null,
    low: 'Low', high: 'High',
    colors: ['#10B981', '#F59E0B', '#DC2626'],
    tip: (f) => `Flood risk: ${f.floodRisk.charAt(0).toUpperCase()}${f.floodRisk.slice(1).toLowerCase()}`,
    missing: (n, total) => `${n} of ${total} farms have a flood check. Farms without one are not shown.`,
  },
};

/** The farms the heatmap shows, each with its blob strength (FLOOR..1). */
export function heatFarms(farms, mode) {
  const m = HEAT_MODES[mode] || HEAT_MODES.density;
  return farms
    .map(f => ({ farm: f, v: m.value(f) }))
    .filter(x => x.v != null)
    .map(x => ({ farm: x.farm, v: x.v, weight: FLOOR + (1 - FLOOR) * x.v }));
}

/**
 * One farm's own colour for a value 0..1, between the legend's low, middle and high colours.
 * Yield and flood draw one circle per farm in this colour, because a blended heatmap adds
 * nearby farms together (two "Low" farms side by side would show as "High").
 */
export function heatColor(mode, v) {
  const [low, mid, high] = (HEAT_MODES[mode] || HEAT_MODES.density).colors;
  const [a, b, t] = v <= 0.5 ? [low, mid, v / 0.5] : [mid, high, (v - 0.5) / 0.5];
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [ca, cb] = [rgb(a), rgb(b)];
  return '#' + ca.map((x, i) => Math.round(x + (cb[i] - x) * t).toString(16).padStart(2, '0')).join('');
}

/** The note under the map title, or '' when every farm has data. */
export function heatNote(farms, mode) {
  const m = HEAT_MODES[mode];
  if (!m || !m.missing) return '';
  const n = heatFarms(farms, mode).length;
  return n === farms.length ? '' : m.missing(n, farms.length);
}

/** leaflet.heat gradient: the floor is the "low" colour, 1 is the "high" colour. */
export function heatGradient(mode) {
  const [low, mid, high] = (HEAT_MODES[mode] || HEAT_MODES.density).colors;
  return { [FLOOR]: low, [(FLOOR + 1) / 2]: mid, 1.0: high };
}

/**
 * Blob radius in screen pixels so a blob covers about 500 m on the ground:
 * it grows as you zoom in, within limits that keep it visible and not too big.
 */
export function heatRadius(zoom, lat = 7.3) {
  const metersPerPixel = 156543.03 * Math.cos(lat * Math.PI / 180) / 2 ** zoom;
  return Math.round(Math.min(90, Math.max(25, 500 / metersPerPixel)));
}
