import { useState, useRef, useEffect } from 'react';
import { C } from '../theme';
import { api } from '../services/api';
import {
  Search, ChevronLeft, ChevronRight, MapPin, Sprout, Leaf, Sun, Wheat,
  Tractor, List, LayoutGrid, Trash2,
} from 'lucide-react';
import Skeleton, { SkeletonStyles, SkelStatCard } from '../components/Skeleton';
import { useLiveRefresh } from '../liveRefresh';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../permissions';
import picLandPrep from '../assets/growth/stage_01.png';
import picPlanting from '../assets/growth/stage_02.png';
import picVegetative from '../assets/growth/stage_03.png';
import picReproductive from '../assets/growth/stage_06.png';
import picHarvesting from '../assets/growth/stage_09.png';

const PAGE_SIZE = 10;
// "Harvest coming up" looks this many days ahead
const SOON_DAYS = 21;
const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const card   = { backgroundColor: C.surface, borderRadius: 24, boxShadow: shadow, overflow: 'hidden' };

const STAGES = ['Land Prep', 'Planting', 'Vegetative', 'Reproductive', 'Harvesting'];
const STATUSES = [
  { value: 'active',    label: 'Active'    },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
];

const STAGE_COLOR = {
  'Land Prep':    { dot: '#9CA3AF', bg: '#F3F4F6',       text: '#6B7280' },
  'Planting':     { dot: C.info,    bg: C.infoLight,      text: C.info    },
  'Vegetative':   { dot: C.primary, bg: C.primaryLighter, text: C.primary },
  'Reproductive': { dot: C.accent,  bg: C.accentLight,    text: C.accent  },
  'Harvesting':   { dot: C.warning, bg: C.warningLight,   text: C.warning },
};

const STAGE_ICON = {
  'Land Prep':    Tractor,
  'Planting':     Sprout,
  'Vegetative':   Leaf,
  'Reproductive': Sun,
  'Harvesting':   Wheat,
};

// Each group's picture: the app's growth stage closest to it
const STAGE_PIC = {
  'Land Prep':    picLandPrep,
  'Planting':     picPlanting,
  'Vegetative':   picVegetative,
  'Reproductive': picReproductive,
  'Harvesting':   picHarvesting,
};

const STATUS_COLOR = {
  active:    { bg: C.successLight, color: C.success },
  completed: { bg: C.infoLight,    color: C.info    },
  abandoned: { bg: C.errorLight,   color: C.error   },
};

// Map any backend stage name to one of our 5 buckets.
function FarmAvatar({ stage }) {
  const sc = STAGE_COLOR[stage] || STAGE_COLOR['Land Prep'];
  return (
    <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <img src={STAGE_PIC[stage] || picLandPrep} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
    </div>
  );
}

function StageProgress({ current }) {
  const idx  = STAGES.indexOf(current);
  const sc   = STAGE_COLOR[current] || STAGE_COLOR['Land Prep'];
  const Icon = STAGE_ICON[current] || Tractor;
  const stageNo = idx + 1;              // 0 for a crop not sown yet
  const pct  = Math.round((stageNo / STAGES.length) * 100);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: sc.bg, padding: '3px 10px 3px 7px', borderRadius: 20 }}>
          <Icon size={12} color={sc.text} />
          <span style={{ fontSize: 12, fontWeight: 600, color: sc.text }}>{current === 'Land Prep' ? 'Land Prep · not sown yet' : current || '—'}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Stage {stageNo} of 5</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F0F2F1', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: sc.dot, borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', minWidth: 34, textAlign: 'right' }}>{pct}%</span>
      </div>
    </div>
  );
}

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
          gap: 6, whiteSpace: 'nowrap', outline: 'none', minWidth: 140,
        }}
      >
        {label}
        <ChevronRight size={13} color={open ? C.primary : '#9CA3AF'}
          style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? '-90deg' : '90deg'})`, transition: 'transform 0.15s' }}
        />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, backgroundColor: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(26,26,46,0.10)', minWidth: '100%', maxHeight: 300, overflowY: 'auto' }}>
          <div onClick={() => { onChange(''); setOpen(false); }}
            style={{ padding: '9px 14px', fontSize: 13, color: !value ? C.primary : '#9CA3AF', cursor: 'pointer', fontWeight: !value ? 600 : 400, backgroundColor: !value ? C.primaryLighter : 'transparent' }}>
            {placeholder}
          </div>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: value === o.value ? C.primary : C.text, fontWeight: value === o.value ? 600 : 400, backgroundColor: value === o.value ? C.primaryLighter : 'transparent' }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_COLOR[status] || { bg: C.surfaceAlt, color: '#9CA3AF' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 20,
      backgroundColor: meta.bg, color: meta.color,
      textTransform: 'capitalize',
    }}>
      {status || 'unknown'}
    </span>
  );
}

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export default function FarmCycles() {
  // Deleting a cycle is admin only; the validator views (the backend enforces both)
  const { role } = useAuth();
  const canDelete = isAdmin(role);
  const [search, setSearch]       = useState('');
  const [stageFilter, setStage]   = useState('');
  // Opens on growing crops; finished ones are one pick away in the status filter
  const [statusFilter, setStatusF]= useState('active');
  const [userFilter, setUser]     = useState('');
  const [view, setView]           = useState('list');
  const [pageAsked, setPage]      = useState(1);
  const [cycles, setCycles]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(null);
  const [error, setError]         = useState('');

  // quiet: a background refresh keeps the table on screen instead of showing the loader
  const load = (quiet = false) => {
    if (!quiet) {
      setLoading(true);
      setError('');
    }
    api.farmCycles()
      .then(data => {
        const normalized = data.map(c => ({
          id:        c.id,
          farmId:    c.farm_id,
          name:      c.farm_name,
          owner:     c.owner_name,
          email:     c.owner_email,
          ownerId:   c.owner_id,
          barangay:  c.barangay,
          area:      Number(c.area_ha) || 0,
          variety:   c.variety,
          nsicCode:  c.nsic_code,
          ecosystem: (c.ecosystem || '').replace(/_/g, ' '),
          season:    c.season,
          year:      c.year,
          planting:  c.planting_date,
          expected:  c.expected_harvest_date,
          actual:    c.actual_harvest_date,
          // The group (Land Prep ... Harvesting) comes from the backend, one rule for every screen
          stage:     c.stage_group_label || '',
          rawStage:  c.current_stage,
          stageNo:   c.stage_no,
          status:    c.status,
          yield:     c.yield_t_ha,
        }));
        setCycles(normalized);
      })
      .catch(err => { if (!quiet) setError(err?.message || 'Failed to load farm cycles.'); })
      .finally(() => setLoading(false));
  };

  // Cycles follow the farmers' planting guides (a logged step moves the stage, a sowing
  // answer moves the dates), so the table keeps itself up to date
  useEffect(() => { load(); }, []);
  useLiveRefresh(() => load(true));

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this farm cycle? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.deleteCycle(id);
      setCycles(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError(err?.message || 'Failed to delete cycle.');
    } finally {
      setDeleting(null);
    }
  };

  const uniqueUsers = [...new Map(cycles.map(c => [String(c.ownerId), c])).entries()]
    .map(([id, c]) => ({ value: id, label: c.email ? `${c.owner} (${c.email})` : c.owner }));

  const filtered = cycles.filter(c => {
    const q = search.toLowerCase();
    return (
      ((c.name || '').toLowerCase().includes(q) ||
       (c.owner || '').toLowerCase().includes(q) ||
       (c.variety || '').toLowerCase().includes(q)) &&
      (!stageFilter  || c.stage  === stageFilter)  &&
      (!statusFilter || c.status === statusFilter) &&
      (!userFilter   || String(c.ownerId) === userFilter)
    );
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Deleting or filtering can leave fewer pages than the one asked for
  const page = Math.min(pageAsked, totalPages);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const stageCounts = STAGES.reduce((a, s) => ({
    ...a,
    [s]: cycles.filter(c => c.stage === s && c.status === 'active').length,
  }), {});

  /* ───── Skeleton state ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
        <SkeletonStyles />
        <div>
          <Skeleton width={250} height={22} radius={6} style={{ marginBottom: 8 }} />
          <Skeleton width={380} height={13} radius={4} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkelStatCard key={i} />)}
        </div>
        <Skeleton width="100%" height={56} radius={12} />
        <div style={card}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              padding: '16px 22px',
              borderBottom: i < 4 ? `1px solid ${C.borderLight}` : 'none',
              display: 'flex', alignItems: 'center', gap: 18,
            }}>
              <Skeleton circle size={46} />
              <div style={{ minWidth: 175, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Skeleton width={140} height={14} radius={4} />
                <Skeleton width={100} height={11} radius={3} />
                <Skeleton width={80}  height={10} radius={3} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <Skeleton width={180} height={20} radius={20} />
                <Skeleton width="100%" height={8} radius={4} />
              </div>
              <Skeleton width={70} height={28} radius={8} />
              <Skeleton width={70} height={28} radius={8} />
              <Skeleton width={32} height={32} radius={8} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', color: C.text }}>Farm cycles</h1>
        <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>
          Active cropping cycles across all farmers — stage, variety, season, and harvest yield from live data.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          ...card, padding: '14px 18px',
          borderLeft: `3px solid ${C.error}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Stage stat cards (active cycles only) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {STAGES.map(s => {
          const sc = STAGE_COLOR[s];
          return (
            <div key={s} style={{ backgroundColor: C.surface, borderRadius: 24, boxShadow: shadow, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s}</p>
                <img src={STAGE_PIC[s]} alt="" style={{ width: 48, height: 48, objectFit: 'contain', marginTop: -6 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 12 }}>
                <p style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: C.text }}>{stageCounts[s]}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 3 }}>cycles</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: sc.bg, color: sc.text, borderRadius: 20, padding: '2px 9px' }}>
                {stageCounts[s] > 0 ? `${stageCounts[s]} active` : 'none'}
              </span>
            </div>
          );
        })}
      </div>

      {/* What is coming, and the season in numbers */}
      {(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const days = iso => Math.round((new Date(iso + 'T00:00:00') - today) / 86400000);
        const soon = cycles
          .filter(c => c.status === 'active' && c.expected && days(c.expected) >= 0 && days(c.expected) <= SOON_DAYS)
          .sort((a, b) => a.expected.localeCompare(b.expected));
        // Growing means sown: a planned crop (Land Prep) has no growth stage yet
        const active = cycles.filter(c => c.status === 'active' && c.stageNo);
        const count = st => cycles.filter(c => c.status === st).length;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16 }}>
            <div style={{ ...card, padding: '18px 22px', overflow: 'visible' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Harvest coming up</p>
              <p style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 3, marginBottom: 12 }}>Crops due in the next {SOON_DAYS} days, soonest first</p>
              {soon.length === 0 ? (
                <p style={{ fontSize: 13, color: C.textSecondary, padding: '8px 0' }}>No harvest due in the next {SOON_DAYS} days.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {soon.slice(0, 6).map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 16, backgroundColor: C.background }}>
                      <img src={picHarvesting} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                        <p style={{ fontSize: 12, color: C.textSecondary }}>{days(c.expected) === 0 ? 'Today' : `In ${days(c.expected)} days`} · {c.variety || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ ...card, padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignContent: 'start', overflow: 'visible' }}>
              {[
                ['Growing', active.length, 'crops'],
                ['Area', active.reduce((n, c) => n + c.area, 0).toFixed(1), 'ha'],
                ['Completed', count('completed'), ''],
                ['Abandoned', count('abandoned'), ''],
              ].map(([label, value, unit]) => (
                <div key={label}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>{label}</p>
                  <p style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{value}</span>
                    {unit && <span style={{ fontSize: 12, color: C.textSecondary, marginLeft: 4 }}>{unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Filter bar */}
      <div style={{ backgroundColor: C.surface, borderRadius: 20, boxShadow: shadow, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by farm, farmer, or variety…"
            style={{ paddingLeft: 32, paddingRight: 12, height: 36, width: '100%', fontSize: 13, border: `1px solid ${C.borderLight}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: C.text, backgroundColor: C.surface }}
          />
        </div>
        <Dropdown value={stageFilter}  onChange={v => { setStage(v);   setPage(1); }} placeholder="All Stages"   options={STAGES.map(s => ({ value: s, label: s }))} />
        <Dropdown value={statusFilter} onChange={v => { setStatusF(v); setPage(1); }} placeholder="All Statuses" options={STATUSES} />
        <Dropdown value={userFilter}   onChange={v => { setUser(v);    setPage(1); }} placeholder="All Farmers"  options={uniqueUsers} />

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${view === 'list' ? C.ink : C.borderLight}`, backgroundColor: view === 'list' ? C.ink : C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <List size={15} color={view === 'list' ? '#fff' : '#9CA3AF'} />
          </button>
          <button onClick={() => setView('grid')} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${view === 'grid' ? C.ink : C.borderLight}`, backgroundColor: view === 'grid' ? C.ink : C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutGrid size={15} color={view === 'grid' ? '#fff' : '#9CA3AF'} />
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div style={card}>
          <div style={{ padding: '14px 22px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} cycle{filtered.length === 1 ? '' : 's'}
            </p>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: C.primaryLighter, color: C.primary }}>
              live · database
            </span>
          </div>

          {paginated.map(c => (
            <div key={c.id} style={{ padding: '16px 22px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 18 }}>
              <FarmAvatar stage={c.stage} />
              <div style={{ minWidth: 200, flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{c.name}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{c.owner}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={10} color="#C4C9D4" />
                    <span style={{ fontSize: 11, color: '#C4C9D4' }}>{c.barangay || '—'}</span>
                  </div>
                  {c.variety && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 5, backgroundColor: C.primaryLighter, color: C.primary }}>
                      {c.nsicCode || c.variety}
                    </span>
                  )}
                </div>
              </div>
              <StageProgress current={c.stage} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 5 }}>Area</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{c.area.toFixed(2)} ha</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 5 }}>Yield</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: c.yield > 0 ? C.primary : '#D1D5DB' }}>
                    {c.yield > 0 ? `${c.yield} t/ha` : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 5 }}>{c.stageNo ? 'Planted' : 'Planned'}</p>
                  <p style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{fmtDate(c.planting)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 5 }}>Status</p>
                  <StatusBadge status={c.status} />
                </div>
              </div>
              {canDelete && (
                <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.errorLight}`, backgroundColor: C.errorLight, cursor: deleting === c.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: deleting === c.id ? 0.5 : 1 }}
                  title="Delete cycle">
                  <Trash2 size={14} color={C.error} />
                </button>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
<div style={{ padding: '56px 20px', textAlign: 'center' }}><p style={{ fontSize: 13.5, fontWeight: 600, color: C.textSecondary, marginTop: 6 }}>{cycles.length ? 'No farm cycles match your search.' : 'No farm cycles yet.'}</p></div>
          )}

          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
        </div>
      )}

      {/* GRID VIEW */}
      {view === 'grid' && (
        <div>
          {filtered.length === 0 && (
            <div style={card}><div style={{ padding: '56px 20px', textAlign: 'center' }}><p style={{ fontSize: 13.5, fontWeight: 600, color: C.textSecondary, marginTop: 6 }}>{cycles.length ? 'No farm cycles match your search.' : 'No farm cycles yet.'}</p></div></div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {paginated.map(c => (
              <div key={c.id} style={{ backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}`, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <FarmAvatar stage={c.stage} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{c.owner}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <MapPin size={9} color="#C4C9D4" />
                      <span style={{ fontSize: 10, color: '#C4C9D4' }}>{c.barangay || '—'}</span>
                      {c.nsicCode && (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '0px 6px', borderRadius: 4, backgroundColor: C.primaryLighter, color: C.primary }}>
                          {c.nsicCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <StageProgress current={c.stage} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
                  <div>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Area</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.area.toFixed(2)} ha</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Yield</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: c.yield > 0 ? C.primary : '#D1D5DB' }}>
                      {c.yield > 0 ? `${c.yield} t/ha` : '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>Status</p>
                    <StatusBadge status={c.status} />
                  </div>
                  {canDelete && (
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.errorLight}`, backgroundColor: C.errorLight, cursor: deleting === c.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deleting === c.id ? 0.5 : 1 }}
                      title="Delete cycle">
                      <Trash2 size={13} color={C.error} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ marginTop: 14 }}>
              <Pagination page={page} totalPages={totalPages} setPage={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, setPage }) {
  return (
    <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface }}>
      <p style={{ fontSize: 12, color: '#9CA3AF' }}>Page {page} of {totalPages}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.borderLight}`, backgroundColor: page === 1 ? C.surfaceAlt : C.surface, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={15} color={page === 1 ? '#D1D5DB' : '#6B7280'} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${page === p ? C.ink : C.borderLight}`, backgroundColor: page === p ? C.ink : C.surface, color: page === p ? '#fff' : '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {p}
          </button>
        ))}
        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.borderLight}`, backgroundColor: page === totalPages ? C.surfaceAlt : C.surface, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={15} color={page === totalPages ? '#D1D5DB' : '#6B7280'} />
        </button>
      </div>
    </div>
  );
}
