import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { C, hatchCss, CHART_GREEN } from '../theme';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../permissions';
import { reverseGeocode, getCachedGeocode } from '../services/geocode';
import Skeleton, { SkeletonStyles, SkelStatCard, SkelListRow } from '../components/Skeleton';
import {
  Sparkles, MapPin, SlidersHorizontal, Plus,
  UserPlus, Wheat, Activity, Wifi, RefreshCw, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, Label } from 'recharts';

const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const card   = { backgroundColor: C.surface, borderRadius: 14, boxShadow: shadow, border: `1px solid ${C.borderLight}`, overflow: 'hidden' };

const ECOSYSTEM_LABEL = {
  irrigated_lowland: 'Irrigated Lowland',
  rainfed_lowland:   'Rainfed Lowland',
  upland:            'Upland',
};
const ECOSYSTEM_COLOR = {
  irrigated_lowland: CHART_GREEN[0],
  rainfed_lowland:   CHART_GREEN[1],
  upland:            CHART_GREEN[3],
};

/* Activity icons ride the same green ramp as the charts and quick actions —
   one shared tint behind them, the icon itself carrying the step. */
const EVENT_META = {
  user_registered: { icon: UserPlus, color: CHART_GREEN[0], bg: C.primaryLighter, route: '/users' },
  farm_pinned:     { icon: MapPin,   color: CHART_GREEN[1], bg: C.primaryLighter, route: '/map'   },
  recommendation:  { icon: Sparkles, color: CHART_GREEN[2], bg: C.primaryLighter, route: '/farms' },
  yield_logged:    { icon: Wheat,    color: CHART_GREEN[3], bg: C.primaryLighter, route: '/farms' },
};

/* -------------------------------------------------------------------------- */
/*  Atoms                                                                     */
/* -------------------------------------------------------------------------- */

/* KPI card, per the design reference: the FIRST card in the row is filled
   solid green with white text, the rest stay white. Layout is label top-left,
   circular outline arrow top-right, then a large number, then a caption. */
function StatCard({ label, value, unit, sub, delta, featured = false, to }) {
  const [hover, setHover] = useState(false);

  const fg       = featured ? '#FFFFFF' : C.text;
  const fgMuted  = featured ? 'rgba(255,255,255,0.75)' : C.textSecondary;
  const hairline = featured ? 'rgba(255,255,255,0.40)' : C.border;

  const body = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: featured ? C.primary : C.surface,
        borderRadius: 18,
        padding: '18px 20px 20px',
        border: `1px solid ${featured ? C.primary : C.borderLight}`,
        boxShadow: featured
          ? '0 6px 18px rgba(31,107,63,0.20)'
          : '0 1px 2px rgba(17,21,17,0.05)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        height: '100%', boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: fgMuted }}>{label}</p>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${hairline}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: hover && !featured ? C.primaryLighter : 'transparent',
          transition: 'background-color 0.15s ease',
        }}>
          <ArrowUpRight size={13} color={featured ? '#FFFFFF' : C.primary} strokeWidth={2.5} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 14 }}>
        <p style={{
          fontSize: 34, fontWeight: 800, lineHeight: 1, color: fg,
          letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </p>
        {unit && <p style={{ fontSize: 12, color: fgMuted, marginBottom: 3 }}>{unit}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minHeight: 18 }}>
        {sub && <p style={{ fontSize: 11.5, color: fgMuted }}>{sub}</p>}
        {delta && (
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            color: featured ? '#FFFFFF' : (delta.positive ? C.primary : C.error),
            backgroundColor: featured
              ? 'rgba(255,255,255,0.18)'
              : (delta.positive ? C.primaryLighter : C.errorLight),
            padding: '2px 8px', borderRadius: 9999,
            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
          }}>
            {delta.positive ? '↑ ' : '↓ '}{delta.value}
          </span>
        )}
      </div>
    </div>
  );

  return to
    ? <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{body}</Link>
    : body;
}

/* Same anatomy as StatCard — label top-left, circular outline arrow top-right,
   headline, then a caption row. The headline here is text rather than a number,
   so it sits at 20px instead of 34px but keeps the same weight and rhythm. */
function HighlightCard({ label, title, value, sub, placeholder, to }) {
  const [hover, setHover] = useState(false);

  const body = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: C.surface,
        borderRadius: 18,
        padding: '18px 20px 20px',
        border: `1px solid ${C.borderLight}`,
        boxShadow: '0 1px 2px rgba(17,21,17,0.05)',
        transform: hover && !placeholder ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        height: '100%', boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: C.textSecondary }}>{label}</p>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${placeholder ? C.borderLight : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: hover && !placeholder ? C.primaryLighter : 'transparent',
          transition: 'background-color 0.15s ease',
        }}>
          <ArrowUpRight
            size={13}
            color={placeholder ? C.textTertiary : C.primary}
            strokeWidth={2.5}
          />
        </div>
      </div>

      <p style={{
        fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginTop: 14,
        letterSpacing: '-0.01em',
        color: placeholder ? C.textTertiary : C.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {title}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minHeight: 18 }}>
        {value && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: C.primary,
            backgroundColor: C.primaryLighter,
            padding: '2px 8px', borderRadius: 9999, whiteSpace: 'nowrap',
          }}>
            {value}
          </span>
        )}
        {sub && <span style={{ fontSize: 11.5, color: C.textSecondary }}>{sub}</span>}
      </div>
    </div>
  );

  return to && !placeholder
    ? <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{body}</Link>
    : body;
}

/* Cellular-style signal bars standing in for the latency figure and status
   word. Bar count encodes responsiveness; the full detail stays available as
   a tooltip so nothing is actually lost.

     4 bars  under 300 ms      1 bar   over 1500 ms
     3 bars  under 800 ms      0 bars  unreachable
     2 bars  under 1500 ms     hollow  reachable but not timed (e.g. an API
                                       that is configured, never pinged) */
function SignalBars({ ok, latencyMs, status }) {
  const HEIGHTS = [7, 11, 15, 19];

  let filled;
  if (!ok) filled = 0;
  else if (latencyMs == null) filled = null;          // configured, untimed
  else if (latencyMs < 300) filled = 4;
  else if (latencyMs < 800) filled = 3;
  else if (latencyMs < 1500) filled = 2;
  else filled = 1;

  const tip = [
    status,
    latencyMs != null ? `${latencyMs} ms` : null,
  ].filter(Boolean).join(' · ');

  // Weak but working reads amber; healthy reads green; down reads red.
  const strong = filled === null || filled >= 3;
  const litColor = !ok ? C.error : strong ? C.primary : C.warning;

  return (
    <div
      title={tip}
      aria-label={tip}
      style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 19, flexShrink: 0 }}
    >
      {HEIGHTS.map((h, i) => {
        const lit = filled === null ? false : i < filled;
        return (
          <span
            key={i}
            style={{
              width: 4, height: h, borderRadius: 2,
              backgroundColor: lit ? litColor : 'transparent',
              border: lit ? 'none' : `1.5px solid ${filled === null ? C.primaryLight : C.border}`,
              boxSizing: 'border-box',
            }}
          />
        );
      })}
    </div>
  );
}

/* One row of the varieties table. Follows the portfolio-table reference:
   an avatar tile, the name with a secondary line beneath, then a run of
   label-above-value metric columns, and a verdict pill on the right. The
   column labels repeat on every row rather than sitting in one header, which
   is what gives that layout its scannable rhythm. */
/* Shared vertical rhythm so every column's label sits on one line and every
   value sits on the next. Both rows have explicit line-heights, otherwise
   differing glyph metrics between columns nudge the baselines apart. */
const CELL_LABEL = {
  fontSize: 10, lineHeight: '13px', color: C.textTertiary,
  fontWeight: 500, margin: 0, whiteSpace: 'nowrap',
};
const CELL_VALUE = {
  fontSize: 13, lineHeight: '18px', fontWeight: 700, color: C.text,
  fontVariantNumeric: 'tabular-nums', margin: 0,
};

function MetricCell({ label, children, width, align = 'left' }) {
  return (
    <div style={{ width, flexShrink: 0, textAlign: align }}>
      <p style={CELL_LABEL}>{label}</p>
      <div style={{ ...CELL_VALUE, marginTop: 4 }}>{children}</div>
    </div>
  );
}

function VarietyRow({
  rank, name, code, color, recs, avgYield, share, barPct,
  ecoLabel, verdict, isTop, last,
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        // Columns are top-aligned so every label sits on one line and every
        // value on the next; the tile and the pill re-centre themselves.
        display: 'flex', alignItems: 'flex-start', gap: 18,
        padding: '15px 12px',
        borderRadius: 12,
        backgroundColor: hover ? C.surfaceAlt : 'transparent',
        borderBottom: last ? 'none' : `1px solid ${C.borderLight}`,
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* Avatar tile — rank on the variety's ecosystem colour */}
      <div style={{
        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
        backgroundColor: color, alignSelf: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
          {rank}
        </span>
      </div>

      {/* Name column — same label/value rhythm as the metric cells, with the
          share bar hanging below the value row. */}
      <div style={{ flex: 1, minWidth: 150 }}>
        <p style={CELL_LABEL}>Variety</p>
        <div style={{
          ...CELL_VALUE, marginTop: 4,
          display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0,
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {code && code !== name && (
            <span style={{
              fontSize: 11, fontWeight: 400, lineHeight: '18px',
              color: C.textTertiary, flexShrink: 0,
            }}>
              {code}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{
            flex: 1, height: 5, borderRadius: 9999, overflow: 'hidden',
            background: hatchCss(), border: `1px solid ${C.borderLight}`,
          }}>
            <div style={{
              width: `${barPct}%`, height: '100%', borderRadius: 9999,
              backgroundColor: isTop ? C.primary : C.primaryLight,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{
            fontSize: 10.5, lineHeight: '13px', color: C.textTertiary,
            flexShrink: 0, fontVariantNumeric: 'tabular-nums',
          }}>
            {share}%
          </span>
        </div>
      </div>

      <MetricCell label="Picks" width={54}>{recs}</MetricCell>

      <MetricCell label="Avg Yield" width={78}>
        {avgYield} <span style={{ fontWeight: 400, fontSize: 11, color: C.textTertiary }}>t/ha</span>
      </MetricCell>

      <MetricCell label="Ecosystem" width={118}>
        <span style={{
          color, fontSize: 12.5, fontWeight: 600,
          display: 'block', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {ecoLabel}
        </span>
      </MetricCell>

      {/* Verdict pill — solid for the leader, soft for the rest */}
      <span style={{
        flexShrink: 0, alignSelf: 'center', textAlign: 'center',
        width: 104, boxSizing: 'border-box',
        fontSize: 11, fontWeight: 700, lineHeight: '18px', whiteSpace: 'nowrap',
        padding: '5px 0', borderRadius: 9999,
        backgroundColor: isTop ? C.primary : C.primaryLighter,
        color: isTop ? '#FFFFFF' : C.primary,
      }}>
        {verdict}
      </span>
    </div>
  );
}

function SectionHeader({ title, sub, right }) {
  return (
    <div style={{
      padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      // Fixed line-heights and a single-line subtitle keep every card header
      // exactly the same height, so side-by-side cards start their content on
      // the same baseline.
      minHeight: 66, boxSizing: 'border-box', flexShrink: 0,
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 15, lineHeight: '20px', fontWeight: 700, color: C.text }}>
          {title}
        </p>
        {sub && (
          <p style={{
            fontSize: 12, lineHeight: '16px', color: C.textTertiary, marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60)        return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)        return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)        return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)         return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}


/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export default function Dashboard() {
  const { role } = useAuth();
  const [stats, setStats]         = useState(null);
  const [health, setHealth]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [lastUpdated, setUpdated] = useState(null);
  const [topLocation, setTopLocation] = useState(null);  // resolved Nominatim address

  const loadAll = async ({ silent = false } = {}) => {
    // A manual Refresh must hit the network; the silent mount load is happy
    // to be served from the GET cache.
    if (!silent) {
      setRefresh(true);
      api.invalidate();
    }
    try {
      const [s, h] = await Promise.allSettled([api.stats(), api.systemHealth()]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (h.status === 'fulfilled') setHealth(h.value);
      setUpdated(new Date());
    } finally {
      setRefresh(false);
      setLoading(false);
    }
  };

  useEffect(() => { loadAll({ silent: true }); }, []);

  // Reverse-geocode top_location coords whenever stats change. Reads
  // the localStorage cache first so revisits are instant; only hits
  // Nominatim if the location hasn't been resolved before.
  useEffect(() => {
    const loc = stats?.top_location;
    if (!loc?.lat || !loc?.lng) {
      setTopLocation(null);
      return;
    }
    const cached = getCachedGeocode(loc.lat, loc.lng);
    if (cached) {
      setTopLocation(cached);
      return;
    }
    let alive = true;
    (async () => {
      const { result } = await reverseGeocode(loc.lat, loc.lng);
      if (alive && result) setTopLocation(result);
    })();
    return () => { alive = false; };
  }, [stats?.top_location]);

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28, backgroundColor: C.background, minHeight: '100%' }}>
        <SkeletonStyles />
        {/* Header skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={170} height={22} radius={6} />
            <Skeleton width={360} height={13} radius={4} />
          </div>
          <Skeleton width={110} height={36} radius={10} />
        </div>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkelStatCard key={i} />)}
        </div>
        {/* Highlight strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ ...card, padding: '16px 18px', display: 'flex', gap: 12 }}>
              <Skeleton circle size={38} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton width="50%" height={10} radius={3} />
                <Skeleton width="80%" height={14} radius={4} />
                <Skeleton width="60%" height={11} radius={3} />
              </div>
            </div>
          ))}
        </div>
        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} style={{ ...card, padding: '20px 24px' }}>
              <Skeleton width={180} height={15} radius={4} style={{ marginBottom: 6 }} />
              <Skeleton width={260} height={11} radius={3} style={{ marginBottom: 18 }} />
              <Skeleton width="100%" height={160} radius={10} />
            </div>
          ))}
        </div>
        {/* Activity + sidebar row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={card}>
            <div style={{ padding: '16px 20px' }}>
              <Skeleton width={140} height={15} radius={4} style={{ marginBottom: 6 }} />
              <Skeleton width={200} height={11} radius={3} />
            </div>
            {Array.from({ length: 5 }).map((_, i) => <SkelListRow key={i} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={card}>
                <div style={{ padding: '16px 20px' }}>
                  <Skeleton width={120} height={15} radius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width={180} height={11} radius={3} />
                </div>
                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} width="100%" height={14} radius={4} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Compute derived display data ──────────────────────────────────────
  const totalFarms      = stats?.total_farms              ?? 0;
  const activeFarms     = stats?.active_farms             ?? 0;
  const totalUsers      = stats?.total_users              ?? 0;
  const totalRecs       = stats?.total_recommendations    ?? 0;
  const recsThisMonth   = stats?.recommendations_this_month ?? 0;
  const avgYield        = stats?.avg_yield_t_ha           ?? 0;
  const activeVars      = stats?.active_varieties         ?? 0;
  const totalHectares   = stats?.total_hectares           ?? 0;
  const totalHarvest    = stats?.total_harvest_t          ?? 0;
  const newUsersWeek    = stats?.new_users_this_week      ?? 0;
  const newUsersPrev    = stats?.new_users_prev_week      ?? 0;
  const newFarmsWeek    = stats?.new_farms_this_week      ?? 0;
  const topLocationRaw  = stats?.top_location;            // {lat, lng, count} or null
  const userGrowthDelta = newUsersWeek - newUsersPrev;

  const ecosystemPie = (stats?.farms_by_ecosystem ?? []).map((e, i) => ({
    key:   e.ecosystem,
    label: ECOSYSTEM_LABEL[e.ecosystem] || e.ecosystem,
    // Known ecosystems keep their fixed step; anything unexpected still draws
    // from the green ramp rather than dropping to gray.
    color: ECOSYSTEM_COLOR[e.ecosystem] || CHART_GREEN[i % CHART_GREEN.length],
    value: e.count,
  }));
  const ecoTotal = ecosystemPie.reduce((s, e) => s + e.value, 0);

  const topVarietiesBar = (stats?.top_varieties ?? []).map(v => ({
    nsic_code: v.nsic_code,
    label:     v.common_name,
    value:     v.rec_count,
    avg_yield: Number(v.avg_yield_t_ha || 0).toFixed(2),
    color:     ECOSYSTEM_COLOR[v.ecosystem] || C.primary,
    ecoLabel:  ECOSYSTEM_LABEL[v.ecosystem] || v.ecosystem || '—',
  }));

  // Largest recommendation count, so each variety row can draw its share as a
  // proportional bar: solid green for the share, hatched for the remainder.
  const maxRecs = Math.max(1, ...topVarietiesBar.map(v => v.value || 0));
  // Total picks, so "Share" reads as a share of all recommendations rather
  // than of the leader.
  const totalRecPicks = topVarietiesBar.reduce((s, v) => s + (v.value || 0), 0) || 1;

  const events = stats?.recent_activity ?? [];

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            System overview · RiceFlow recommendation engine and registered farmers in Panabo City.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => loadAll()} disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: refreshing ? C.surfaceAlt : C.surface,
              color: refreshing ? '#9CA3AF' : C.text,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 10, padding: '9px 14px',
              fontSize: 13, fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
            <RefreshCw size={13} style={{
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
            }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── 4 KPI cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          featured
          label="Registered Farmers"
          value={totalUsers}
          unit="farmers"
          sub={newUsersWeek > 0 ? `this week` : 'no new this week'}
          delta={newUsersWeek > 0 ? { value: newUsersWeek, positive: userGrowthDelta >= 0 } : null}
          to={canAccess(role, '/users') ? "/users" : undefined}
        />
        <StatCard
          label="Active Farms"
          value={activeFarms}
          unit={`of ${totalFarms}`}
          sub={`${totalHectares.toLocaleString()} ha cultivated`}
          delta={newFarmsWeek > 0 ? { value: newFarmsWeek, positive: true } : null}
          to="/map"
        />
        <StatCard
          label="Recommendations"
          value={totalRecs}
          unit="total"
          sub={recsThisMonth > 0 ? `${recsThisMonth} this month` : `${activeVars} active varieties`}
          delta={recsThisMonth > 0 ? { value: recsThisMonth, positive: true } : null}
          to="/farms"
        />
        <StatCard
          label="Average Yield"
          value={avgYield}
          unit="t/ha"
          sub={`${stats?.yield_records ?? 0} harvest record${stats?.yield_records === 1 ? '' : 's'} · ${totalHarvest} t total`}
          to="/farms"
        />
      </div>

      {/* ── Highlight strip ──────────────────────────────────────────── */}
      {(topLocationRaw || totalHarvest > 0 || newUsersWeek > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {/* Top Location — Nominatim resolved */}
          <HighlightCard
            label="Top Location"
            to="/map"
            title={
              topLocationRaw
                ? (topLocation
                    ? [topLocation.barangay, topLocation.city].filter(Boolean).join(', ')
                      || 'Location resolved'
                    : 'Resolving location…')
                : 'No farms pinned yet'
            }
            value={topLocationRaw
              ? `${topLocationRaw.count} farm${topLocationRaw.count === 1 ? '' : 's'}`
              : ''}
            sub={topLocationRaw && topLocation ? (
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                {Number(topLocationRaw.lat).toFixed(4)}, {Number(topLocationRaw.lng).toFixed(4)}
              </span>
            ) : null}
            placeholder={!topLocationRaw}
          />

          {/* Total Harvest */}
          <HighlightCard
            label="Total Harvest"
            to="/farms"
            title={totalHarvest > 0 ? `${totalHarvest.toLocaleString()} tonnes` : 'No harvests yet'}
            value={totalHarvest > 0 ? `${stats?.yield_records ?? 0} record${stats?.yield_records === 1 ? '' : 's'}` : ''}
            sub={totalHarvest > 0 ? 'Cumulative across all cycles' : null}
            placeholder={totalHarvest === 0}
          />

          {/* New Farmers */}
          <HighlightCard
            label="New Farmers"
            to={canAccess(role, '/users') ? "/users" : undefined}
            title={newUsersWeek > 0 ? `+${newUsersWeek} this week` : 'No new this week'}
            value={newUsersWeek > 0 && newUsersPrev > 0
              ? `${userGrowthDelta >= 0 ? '+' : ''}${userGrowthDelta} vs last week`
              : ''}
            sub={newUsersWeek > 0 ? 'Last 7 days' : null}
            placeholder={newUsersWeek === 0}
          />
        </div>
      )}

      {/* ── Two charts row ────────────────────────────────────────────── */}
      {/* Donut column is fixed so the square card hugs the 300px chart. */}
      <div style={{ display: 'grid', gridTemplateColumns: '392px minmax(0, 1fr)', gap: 20 }}>

        {/* Farms by Ecosystem — donut. minHeight rather than a fixed height so
            the grid can stretch both cards to a common height. */}
        <div style={{ ...card, minHeight: 392, display: 'flex', flexDirection: 'column' }}>
          <SectionHeader
            title="Farms by Ecosystem"
            sub="Share of registered farms by water regime"
          />

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '4px 12px 22px' }}>
            {ecoTotal > 0 ? (
              <>
                <PieChart width={272} height={272} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={ecosystemPie}
                    dataKey="value"
                    nameKey="label"
                    cx={136} cy={136}
                    innerRadius={68}
                    outerRadius={100}
                    stroke={C.surface}
                    strokeWidth={4}
                    isAnimationActive={false}
                  >
                    {ecosystemPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    <Label
                      position="center"
                      content={({ viewBox }) => {
                        if (!viewBox || !('cx' in viewBox)) return null;
                        const { cx, cy } = viewBox;
                        // Static: the grand total, as in the reference donut.
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={cx} y={cy - 6} fill={C.text} fontSize="32" fontWeight="800">
                              {ecoTotal.toLocaleString()}
                            </tspan>
                            <tspan x={cx} y={cy + 20} fill={C.textSecondary} fontSize="12.5">
                              {ecoTotal === 1 ? 'Farm' : 'Farms'}
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                </PieChart>

                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 18px', marginTop: 4 }}>
                  {ecosystemPie.map(e => (
                    <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: e.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>
                        {e.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>No farms registered yet.</p>
            )}
          </div>
        </div>

        {/* Top Recommended Varieties — table of the engine's most-picked rows */}
        <div style={{ ...card, minHeight: 392, display: 'flex', flexDirection: 'column' }}>
          <SectionHeader
            title="Top Recommended Varieties"
            sub="The varieties appearing most often in the engine's top-3 picks"
          />
          <div style={{
            flex: 1, minHeight: 0,
            padding: '12px 24px 16px',
            display: 'flex', flexDirection: 'column',
            // Rows sit at the top; leftover space stays at the bottom rather
            // than stretching the rows to fill the taller card.
            justifyContent: 'flex-start',
          }}>
            {topVarietiesBar.length > 0 ? topVarietiesBar.map((v, i) => {
              // Show common_name only when it differs from nsic_code,
              // otherwise nsic_code alone is enough.
              const name = (v.label && v.label !== v.nsic_code) ? v.label : v.nsic_code;
              const isTop  = i === 0;
              const share  = Math.round((v.value / totalRecPicks) * 100);
              const verdict = isTop ? 'Top Pick' : i < 3 ? 'Recommended' : 'Considered';

              return (
                <VarietyRow
                  key={v.nsic_code || i}
                  rank={i + 1}
                  name={name}
                  code={v.nsic_code}
                  color={v.color}
                  recs={v.value}
                  avgYield={v.avg_yield}
                  share={share}
                  barPct={Math.round((v.value / maxRecs) * 100)}
                  ecoLabel={v.ecoLabel}
                  verdict={verdict}
                  isTop={isTop}
                  last={i === topVarietiesBar.length - 1}
                />
              );
            }) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                No recommendations generated yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Activity + Quick Actions row ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

        {/* Recent Activity */}
        <div style={card}>
          <SectionHeader
            title="Recent Activity"
            sub="Aggregated logs across the system"
            right={
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: C.primaryLighter, color: C.primary }}>
                live · database
              </span>
            }
          />
          <div>
            {events.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                No activity yet. Once farmers register and run scans, they'll appear here.
              </div>
            )}
            {events.map((e, i) => {
              const meta = EVENT_META[e.type] || { icon: Activity, color: C.textSecondary, bg: C.surfaceAlt, route: null };
              const Icon = meta.icon;
              const inner = (
                <>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    backgroundColor: meta.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: C.text }}>
                      <span style={{ fontWeight: 700 }}>{e.actor}</span>
                      <span style={{ color: C.textSecondary }}> {e.message}</span>
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
                    {timeAgo(e.when)}
                  </span>
                  {meta.route && <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />}
                </>
              );

              const baseStyle = {
                padding: '14px 20px',
                borderBottom: i < events.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                display: 'flex', alignItems: 'center', gap: 14,
              };

              return meta.route ? (
                <Link key={i} to={meta.route} style={{
                  ...baseStyle, textDecoration: 'none', color: 'inherit',
                  cursor: 'pointer', transition: 'background-color 0.12s',
                }}
                  onMouseEnter={ev => { ev.currentTarget.style.backgroundColor = C.surfaceAlt; }}
                  onMouseLeave={ev => { ev.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {inner}
                </Link>
              ) : (
                <div key={i} style={baseStyle}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column — Quick Actions + System Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Quick Actions */}
          <div style={card}>
            <SectionHeader title="Quick Actions" sub="Shortcut to admin tasks" />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                /* One hue, four steps of the brand ramp — the actions stay
                   distinguishable without introducing blue/gold/orange. */
                { to: '/users',    label: 'Add User',               sub: 'Create a new farmer or admin account', Icon: UserPlus,          color: CHART_GREEN[0] },
                { to: '/datasets', label: 'Add Rice Variety',       sub: 'Register a new NSIC variety',          Icon: Plus,              color: CHART_GREEN[1] },
                { to: '/rules',    label: 'Edit Suitability Rules', sub: 'Update FAO ranges and WLC weights',    Icon: SlidersHorizontal, color: CHART_GREEN[2] },
                { to: '/map',      label: 'View Farm Map',          sub: 'Geographic distribution of farms',     Icon: MapPin,            color: CHART_GREEN[3] },
              ].filter(a => canAccess(role, a.to)).map(a => (
                <Link key={a.to} to={a.to} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  backgroundColor: C.surface,
                  border: `1px solid ${C.borderLight}`,
                  transition: 'background-color 0.12s, border-color 0.12s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.surfaceAlt; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.surface; }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    // One shared tint so the tiles read as a set; the icon
                    // itself carries the step of the ramp.
                    backgroundColor: C.primaryLighter,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <a.Icon size={15} color={a.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.label}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{a.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* System Health — live from backend */}
          <div style={card}>
            <SectionHeader
              title="System Health"
              sub="Live status of external services"
              right={
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  backgroundColor: health?.all_ok ? C.successLight : C.errorLight,
                  color: health?.all_ok ? C.success : C.error,
                }}>
                  {health ? (health.all_ok ? 'all operational' : 'issue detected') : 'checking…'}
                </span>
              }
            />
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(health?.services ?? []).map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    backgroundColor: s.ok ? C.success : C.error, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{s.label}</span>
                  <SignalBars ok={s.ok} latencyMs={s.latency_ms} status={s.status} />
                </div>
              ))}
              {!health && (
                <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
                  Pinging external services…
                </p>
              )}
              <div style={{ height: 1, backgroundColor: C.borderLight, margin: '4px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wifi size={11} color={health?.all_ok ? C.success : '#9CA3AF'} />
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {health
                    ? `${(health.services || []).filter(s => s.ok).length} / ${(health.services || []).length} services responding`
                    : 'Status pending…'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
