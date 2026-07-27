import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
// IMPORTANT: leafletSetup must come before any usage of L.heatLayer.
// It sets window.L = L so the leaflet.heat UMD plugin can attach itself.
import L from '../services/leafletSetup';
import 'leaflet/dist/leaflet.css';
import { C } from '../theme';
import { api } from '../services/api';
import { reverseGeocode, getCachedGeocode } from '../services/geocode';
import { MapPin, ChevronLeft, ChevronRight, Search, Flame, Layers } from 'lucide-react';
import { SkeletonStyles, SkelListRow } from '../components/Skeleton';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const card   = { backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}` };

const ECOSYSTEM_COLOR = {
  'irrigated lowland': C.info,
  'rainfed lowland':   C.success,
  'upland':            C.warning,
};
const ECOSYSTEMS = ['irrigated lowland', 'rainfed lowland', 'upland'];
const colorFor = (eco) => ECOSYSTEM_COLOR[eco] || C.textTertiary;


/**
 * Collapse names that were stored with last_name = first_name
 * (e.g. "Frank Frank" → "Frank"). Defensive — backend already cleans
 * this in some endpoints, but the farm owner_name still goes through
 * Django's get_full_name() which doesn't dedupe.
 */
function dedupeName(raw) {
  const s = (raw || '').trim();
  if (!s) return s;
  const parts = s.split(/\s+/);
  if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
    return [parts[0], ...parts.slice(2)].join(' ').trim();
  }
  return s;
}

const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.22)"></div>`,
  iconSize: [13, 13], iconAnchor: [6, 6],
});

const PAGE_SIZE = 10;

function FitBounds({ farms }) {
  const map = useMap();
  useEffect(() => {
    const valid = farms.filter(f => !isNaN(f.lat) && !isNaN(f.lng) && f.lat !== 0 && f.lng !== 0);
    if (!valid.length) return;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 13);
    } else {
      map.fitBounds(valid.map(f => [f.lat, f.lng]), { padding: [40, 40] });
    }
  }, [farms]);
  return null;
}


/**
 * Heatmap weighting strategies. Returns a value 0..1 per farm so
 * leaflet.heat can render density, yield, or flood-risk hotspots.
 */
const FLOOD_WEIGHTS = { low: 0.18, moderate: 0.55, high: 1.0 };

const HEATMAP_WEIGHTS = {
  density: (_f) => 1,
  yield:   (f)  => Math.min(1, Math.max(0, (Number(f.yieldTHa) || 0) / 7)),
  flood:   (f)  => FLOOD_WEIGHTS[(f.floodRisk || '').toLowerCase()] ?? 0.18,
};

/**
 * Leaflet.heat overlay — softly shaded blobs showing farm density,
 * yield, or flood risk depending on the active mode.
 */
function HeatLayer({ farms, mode = 'density' }) {
  const map = useMap();
  useEffect(() => {
    if (!farms.length) return;
    if (typeof L.heatLayer !== 'function') {
      // eslint-disable-next-line no-console
      console.error('[FarmMap] leaflet.heat plugin not loaded — check src/services/leafletSetup.js');
      return;
    }
    const weight = HEATMAP_WEIGHTS[mode] || HEATMAP_WEIGHTS.density;
    const points = farms.map(f => [f.lat, f.lng, weight(f)]);
    const layer = L.heatLayer(points, {
      radius:  28,
      blur:    20,
      maxZoom: 17,
      minOpacity: 0.45,
      gradient: {
        0.2: '#3D9D5E',
        0.4: '#F9A825',
        0.7: '#F5A623',
        1.0: '#E74C3C',
      },
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [farms, mode, map]);
  return null;
}


/**
 * Reusable popup content so all three map modes share the same UI.
 */
function FarmPopup({ f, r }) {
  return (
    <div style={{ fontSize: 13, minWidth: 200 }}>
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{f.name}</p>
      <p style={{ color: '#6B7280', marginBottom: 8 }}>{f.owner}</p>
      <p>
        <b>Barangay:</b>{' '}
        {r?.barangay
          ? r.barangay
          : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>resolving…</span>}
      </p>
      <p>
        <b>City:</b>{' '}
        {r?.city
          ? r.city
          : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>resolving…</span>}
      </p>
      <p><b>Ecosystem:</b> <span style={{ textTransform: 'capitalize' }}>{f.ecosystem}</span></p>
      <p><b>Area:</b> {f.area.toFixed(2)} ha</p>
      <p style={{ marginTop: 6, fontFamily: 'ui-monospace, monospace', color: '#6B7280', fontSize: 11 }}>
        GPS: {f.lat.toFixed(5)}, {f.lng.toFixed(5)}
      </p>
    </div>
  );
}


/**
 * Custom numbered icon for cluster groups, matching the rest of the admin.
 */
const clusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 38px; height: 38px; border-radius: 50%;
        background: ${C.primary};
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        color: white; font-weight: 700; font-size: 13px;
        display: flex; align-items: center; justify-content: center;
        font-family: Inter, system-ui, sans-serif;
      ">${count}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

function Dropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = value ? options.find(o => o.value === value)?.label : placeholder;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          height: 36, paddingLeft: 14, paddingRight: 36, fontSize: 13,
          border: `1px solid ${open ? C.primary : C.borderLight}`,
          borderRadius: 8, backgroundColor: C.surface, color: value ? C.text : '#9CA3AF',
          cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
          whiteSpace: 'nowrap', outline: 'none', minWidth: 140, position: 'relative',
        }}
      >
        {label}
        <ChevronRight
          size={13}
          color={open ? C.primary : '#9CA3AF'}
          style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? '-90deg' : '90deg'})`, transition: 'transform 0.15s' }}
        />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, backgroundColor: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(26,26,46,0.10)', minWidth: '100%', overflow: 'hidden' }}>
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            style={{ padding: '9px 14px', fontSize: 13, color: !value ? C.primary : '#9CA3AF', cursor: 'pointer', fontWeight: !value ? 600 : 400, backgroundColor: !value ? C.primaryLighter : 'transparent' }}
            onMouseEnter={e => { if (value) e.currentTarget.style.backgroundColor = C.surfaceAlt; }}
            onMouseLeave={e => { if (value) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >{placeholder}</div>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: value === o.value ? C.primary : C.text, fontWeight: value === o.value ? 600 : 400, backgroundColor: value === o.value ? C.primaryLighter : 'transparent' }}
              onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.backgroundColor = C.surfaceAlt; }}
              onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

const MAP_MODES = [
  { value: 'pins',     label: 'Pins',     Icon: MapPin },
  { value: 'heatmap',  label: 'Heatmap',  Icon: Flame  },
  { value: 'clusters', label: 'Clusters', Icon: Layers },
];

const HEATMAP_MODE_OPTIONS = [
  { value: 'density', label: 'Farm Density', desc: 'Where farms cluster geographically' },
  { value: 'yield',   label: 'Avg Yield',     desc: 'Where productivity is highest'      },
  { value: 'flood',   label: 'Flood Risk',    desc: 'Areas exposed to flood risk'        },
];

export default function FarmMap() {
  const [search, setSearch]     = useState('');
  const [riskFilter, setRisk]   = useState('');
  const [page, setPage]         = useState(1);
  const [farms, setFarms]       = useState([]);
  const [resolved, setResolved] = useState({});  // { farmId: { barangay, city, province } }
  const [mapMode, setMapMode]   = useState('pins');
  const [heatMode, setHeatMode] = useState('density');
  const [heatPickerOpen, setHeatPickerOpen] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.farms()
      .then(data => {
        const normalized = data.map(f => ({
          id:        f.id,
          name:      f.name,
          owner:     dedupeName(f.owner_name) || 'Unknown',
          barangay:  f.barangay || '',
          lat:       parseFloat(f.latitude),
          lng:       parseFloat(f.longitude),
          area:      parseFloat(f.area_hectares) || 0,
          ecosystem: (f.ecosystem || '').replace(/_/g, ' '),
          isActive:  f.is_active,
          floodRisk: f.latest_flood_risk || '',
          yieldTHa:  f.latest_yield_t_ha,
        })).filter(f => !isNaN(f.lat) && !isNaN(f.lng));
        setFarms(normalized);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Geocoding strategy:
  //   1. Synchronous pass — populate everything already in localStorage
  //      (including from past sessions or shared coordinates) so cached
  //      farms appear instantly.
  //   2. Async pass — fetch the remaining unique coordinates from
  //      Nominatim, throttled only when a real network call happens.
  useEffect(() => {
    if (!farms.length) return;

    // Pass 1: pull every cached resolution up-front.
    const fromCache = {};
    for (const f of farms) {
      const hit = getCachedGeocode(f.lat, f.lng);
      if (hit) fromCache[f.id] = hit;
    }
    if (Object.keys(fromCache).length) {
      setResolved(prev => ({ ...fromCache, ...prev }));
    }

    // Pass 2: live fetch the rest, throttled only when network was used.
    let alive = true;
    (async () => {
      for (const f of farms) {
        if (!alive) return;
        if (fromCache[f.id]) continue;
        const { result, fromNetwork } = await reverseGeocode(f.lat, f.lng);
        if (!alive) return;
        if (result) setResolved(prev => ({ ...prev, [f.id]: result }));
        if (fromNetwork) await new Promise(r => setTimeout(r, 1100));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farms]);

  const filtered = farms.filter(f => {
    const q = search.toLowerCase();
    return (
      (f.name.toLowerCase().includes(q) || (f.owner || '').toLowerCase().includes(q) || (f.barangay || '').toLowerCase().includes(q)) &&
      (!riskFilter || f.ecosystem === riskFilter)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Farm Map</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          Real GPS locations of all pinned farms — coordinates captured from the mobile app.
        </p>
      </div>

      {/* Map */}
      <div style={card}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Farm Locations</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {filtered.length} farms mapped · Panabo City, Davao del Norte
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* Mode toggle */}
            <div style={{
              display: 'flex', gap: 4, padding: 4,
              backgroundColor: C.surfaceAlt, borderRadius: 10,
            }}>
              {MAP_MODES.map(m => {
                const on = mapMode === m.value;
                return (
                  <button key={m.value}
                    onClick={() => { setMapMode(m.value); setHeatPickerOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px',
                      fontSize: 12, fontWeight: 600,
                      color: on ? C.text : '#9CA3AF',
                      backgroundColor: on ? C.surface : 'transparent',
                      border: 'none', borderRadius: 7,
                      cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: on ? '0 1px 3px rgba(26,26,46,0.08)' : 'none',
                      transition: 'background-color 0.12s',
                    }}>
                    <m.Icon size={12} />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Heatmap variable picker (only when heatmap is active) */}
            {mapMode === 'heatmap' && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setHeatPickerOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    fontSize: 12, fontWeight: 600,
                    color: C.text,
                    backgroundColor: C.surface,
                    border: `1px solid ${heatPickerOpen ? C.primary : C.borderLight}`,
                    borderRadius: 8,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {HEATMAP_MODE_OPTIONS.find(o => o.value === heatMode)?.label}
                  <ChevronRight size={11} color="#9CA3AF" style={{ transform: `rotate(${heatPickerOpen ? '-90deg' : '90deg'})`, transition: 'transform 0.15s' }} />
                </button>
                {heatPickerOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 1000,
                    backgroundColor: C.surface, border: `1px solid ${C.borderLight}`,
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(26,26,46,0.10)',
                    minWidth: 240, overflow: 'hidden',
                  }}>
                    {HEATMAP_MODE_OPTIONS.map(o => {
                      const on = heatMode === o.value;
                      return (
                        <div key={o.value}
                          onClick={() => { setHeatMode(o.value); setHeatPickerOpen(false); }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer',
                            backgroundColor: on ? C.primaryLighter : 'transparent',
                            borderLeft: on ? `3px solid ${C.primary}` : '3px solid transparent',
                          }}
                          onMouseEnter={e => { if (!on) e.currentTarget.style.backgroundColor = C.surfaceAlt; }}
                          onMouseLeave={e => { if (!on) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <p style={{ fontSize: 13, fontWeight: on ? 700 : 600, color: on ? C.primary : C.text }}>{o.label}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{o.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Legend (only when pins or clusters are shown) */}
            {mapMode !== 'heatmap' && (
              <div style={{ display: 'flex', gap: 14 }}>
                {ECOSYSTEMS.map(e => (
                  <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ECOSYSTEM_COLOR[e] }} />
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Heatmap gradient legend */}
            {mapMode === 'heatmap' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>low</span>
                <div style={{
                  width: 90, height: 6, borderRadius: 4,
                  background: 'linear-gradient(90deg, #3D9D5E, #F9A825, #F5A623, #E74C3C)',
                }} />
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>high</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ height: 520, overflow: 'hidden', borderRadius: '0 0 12px 12px' }}>
          <MapContainer center={[7.3086, 125.6839]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds farms={filtered} />

            {mapMode === 'heatmap' && <HeatLayer farms={filtered} mode={heatMode} />}

            {mapMode === 'pins' && filtered.map(f => {
              const r = resolved[f.id];
              return (
                <Marker key={f.id} position={[f.lat, f.lng]} icon={makeIcon(colorFor(f.ecosystem))}>
                  <Popup>
                    <FarmPopup f={f} r={r} />
                  </Popup>
                </Marker>
              );
            })}

            {mapMode === 'clusters' && (
              <MarkerClusterGroup
                chunkedLoading
                showCoverageOnHover={false}
                spiderfyOnMaxZoom
                iconCreateFunction={clusterIcon}
              >
                {filtered.map(f => {
                  const r = resolved[f.id];
                  return (
                    <Marker key={f.id} position={[f.lat, f.lng]} icon={makeIcon(colorFor(f.ecosystem))}>
                      <Popup>
                        <FarmPopup f={f} r={r} />
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by farm, owner or barangay..."
            style={{ paddingLeft: 32, paddingRight: 12, height: 36, width: '100%', fontSize: 13, border: `1px solid ${C.borderLight}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: C.text, backgroundColor: C.surface }}
          />
        </div>
        <Dropdown
          value={riskFilter}
          onChange={v => { setRisk(v); setPage(1); }}
          placeholder="All Ecosystems"
          options={ECOSYSTEMS.map(e => ({ value: e, label: e.replace(/^./, c => c.toUpperCase()) }))}
        />
      </div>

      {/* Farm list */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Registered Farms</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} farms
          </p>
        </div>

        <div>
          {loading && Array.from({ length: 5 }).map((_, i) => <SkelListRow key={`sk-${i}`} />)}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No farms match your search.</div>
          )}
          {paginated.map((f, i) => {
            const r = resolved[f.id];
            const locLine = r
              ? [r.barangay, r.city].filter(Boolean).join(', ')
              : null;
            return (
              <div key={f.id} style={{ padding: '14px 20px', borderBottom: i < paginated.length - 1 ? `1px solid ${C.borderLight}` : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: C.primaryLighter, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={15} color={C.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{f.name}</p>
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>by {f.owner}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    {locLine ? (
                      <>
                        <p style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>{locLine}</p>
                        <span style={{
                          fontSize: 9, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 4,
                          backgroundColor: C.primaryLighter, color: C.primary,
                          letterSpacing: '0.06em',
                        }}>
                          GPS
                        </span>
                      </>
                    ) : (
                      <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                        resolving location…
                      </p>
                    )}
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'ui-monospace, monospace' }}>
                      {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: C.surfaceAlt, color: '#6B7280', padding: '3px 10px', borderRadius: 20, flexShrink: 0, textTransform: 'capitalize' }}>
                  {f.ecosystem}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flexShrink: 0, width: 62, textAlign: 'right' }}>
                  {f.area.toFixed(2)} ha
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, width: 64 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: f.isActive ? C.success : '#D1D5DB' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: f.isActive ? C.success : '#9CA3AF' }}>{f.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Page {page} of {totalPages}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.borderLight}`, backgroundColor: page === 1 ? C.surfaceAlt : C.surface, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={15} color={page === 1 ? '#D1D5DB' : '#6B7280'} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${page === p ? C.primary : C.borderLight}`, backgroundColor: page === p ? C.primary : C.surface, color: page === p ? '#fff' : '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.borderLight}`, backgroundColor: page === totalPages ? C.surfaceAlt : C.surface, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={15} color={page === totalPages ? '#D1D5DB' : '#6B7280'} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
