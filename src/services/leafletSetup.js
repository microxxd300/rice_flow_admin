/**
 * Leaflet plugin bootstrap.
 *
 * leaflet.heat is a UMD plugin that attaches `heatLayer` to a global
 * window.L. Vite's ESM imports do NOT expose Leaflet globally, so the
 * plugin silently fails — L.heatLayer ends up undefined.
 *
 * This module sets the global first, then imports the plugin, so by
 * the time any page calls L.heatLayer(...) the function exists.
 *
 * Import this file ONCE, before any component that needs L.heatLayer.
 */
import L from 'leaflet';

if (typeof window !== 'undefined' && !window.L) {
  window.L = L;
}

// Side-effect import — attaches heatLayer to window.L (and to our L
// because they are now the same reference).
import 'leaflet.heat';

export default L;
