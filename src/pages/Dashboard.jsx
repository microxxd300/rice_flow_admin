import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { C } from '../theme';
import { api } from '../services/api';
import { reverseGeocode, getCachedGeocode } from '../services/geocode';
import Skeleton, { SkeletonStyles, SkelStatCard, SkelListRow } from '../components/Skeleton';
import {
  Users as UsersIcon, Tractor, Sparkles, TrendingUp,
  Sprout, MapPin, FileBarChart, SlidersHorizontal, Plus,
  UserPlus, Wheat, Activity, Wifi, RefreshCw, ChevronRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const card   = { backgroundColor: C.surface, borderRadius: 14, boxShadow: shadow, border: `1px solid ${C.borderLight}`, overflow: 'hidden' };

const ECOSYSTEM_LABEL = {
  irrigated_lowland: 'Irrigated Lowland',
  rainfed_lowland:   'Rainfed Lowland',
  upland:            'Upland',
};
const ECOSYSTEM_COLOR = {
  irrigated_lowland: C.info,
  rainfed_lowland:   C.success,
  upland:            C.warning,
};

const EVENT_META = {
  user_registered: { icon: UserPlus,    color: C.info,      bg: C.infoLight,      route: '/users' },
  farm_pinned:     { icon: MapPin,      color: C.primary,   bg: C.primaryLighter, route: '/map'   },
  recommendation:  { icon: Sparkles,    color: C.accent,    bg: C.accentLight,    route: '/farms' },
  yield_logged:    { icon: Wheat,       color: C.success,   bg: C.successLight,   route: '/farms' },
};

/* -------------------------------------------------------------------------- */
/*  Atoms                                                                     */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, unit, sub, Icon, accent = C.primary, delta }) {
  // delta = { value: number, label: string, positive: bool }
  return (
    <div style={{ ...card, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>{label}</p>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          backgroundColor: accent + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={accent} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
        <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        {unit && <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>{unit}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {delta && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: delta.positive ? C.success : C.error,
            backgroundColor: (delta.positive ? C.success : C.error) + '15',
            padding: '2px 7px', borderRadius: 6,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {delta.positive ? '+' : ''}{delta.value}
          </span>
        )}
        {sub && <p style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</p>}
      </div>
    </div>
  );
}

function HighlightCard({ label, Icon, iconColor, iconBg, title, value, sub, placeholder }) {
  return (
    <div style={{
      ...card,
      padding: '16px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      opacity: placeholder ? 0.7 : 1,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          {label}
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: placeholder ? '#9CA3AF' : C.text, marginTop: 4, lineHeight: 1.3 }}>
          {title}
        </p>
        {(value || sub) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {value && (
              <span style={{ fontSize: 11, color: iconColor, fontWeight: 600 }}>{value}</span>
            )}
            {sub && (
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, right }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</p>
        {sub && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{sub}</p>}
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
  const [stats, setStats]         = useState(null);
  const [health, setHealth]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [lastUpdated, setUpdated] = useState(null);
  const [topLocation, setTopLocation] = useState(null);  // resolved Nominatim address

  const loadAll = async ({ silent = false } = {}) => {
    if (!silent) setRefresh(true);
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
      <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28, backgroundColor: C.background, minHeight: '100vh' }}>
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

  const ecosystemPie = (stats?.farms_by_ecosystem ?? []).map(e => ({
    key:   e.ecosystem,
    label: ECOSYSTEM_LABEL[e.ecosystem] || e.ecosystem,
    color: ECOSYSTEM_COLOR[e.ecosystem] || '#9CA3AF',
    value: e.count,
  }));
  const ecoTotal = ecosystemPie.reduce((s, e) => s + e.value, 0);

  const topVarietiesBar = (stats?.top_varieties ?? []).map(v => ({
    nsic_code: v.nsic_code,
    label:     v.common_name,
    value:     v.rec_count,
    avg_yield: Number(v.avg_yield_t_ha || 0).toFixed(2),
    color:     ECOSYSTEM_COLOR[v.ecosystem] || C.primary,
  }));

  const events = stats?.recent_activity ?? [];

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28, backgroundColor: C.background, minHeight: '100vh' }}>
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
          label="Registered Farmers"
          value={totalUsers}
          unit="farmers"
          sub={newUsersWeek > 0 ? `this week` : 'no new this week'}
          delta={newUsersWeek > 0 ? { value: newUsersWeek, positive: userGrowthDelta >= 0 } : null}
          Icon={UsersIcon}
          accent={C.info}
        />
        <StatCard
          label="Active Farms"
          value={activeFarms}
          unit={`of ${totalFarms}`}
          sub={`${totalHectares.toLocaleString()} ha cultivated`}
          delta={newFarmsWeek > 0 ? { value: newFarmsWeek, positive: true } : null}
          Icon={Tractor}
          accent={C.primary}
        />
        <StatCard
          label="Recommendations"
          value={totalRecs}
          unit="total"
          sub={recsThisMonth > 0 ? `${recsThisMonth} this month` : `${activeVars} active varieties`}
          delta={recsThisMonth > 0 ? { value: recsThisMonth, positive: true } : null}
          Icon={Sparkles}
          accent={C.accent}
        />
        <StatCard
          label="Average Yield"
          value={avgYield}
          unit="t/ha"
          sub={`${stats?.yield_records ?? 0} harvest record${stats?.yield_records === 1 ? '' : 's'} · ${totalHarvest} t total`}
          Icon={TrendingUp}
          accent={C.success}
        />
      </div>

      {/* ── Highlight strip ──────────────────────────────────────────── */}
      {(topLocationRaw || totalHarvest > 0 || newUsersWeek > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {/* Top Location — Nominatim resolved */}
          <HighlightCard
            label="Top Location"
            Icon={MapPin}
            iconColor={C.primary}
            iconBg={C.primaryLighter}
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
            Icon={Wheat}
            iconColor={C.success}
            iconBg={C.successLight}
            title={totalHarvest > 0 ? `${totalHarvest.toLocaleString()} tonnes` : 'No harvests yet'}
            value={totalHarvest > 0 ? `${stats?.yield_records ?? 0} record${stats?.yield_records === 1 ? '' : 's'}` : ''}
            sub={totalHarvest > 0 ? 'Cumulative across all cycles' : null}
            placeholder={totalHarvest === 0}
          />

          {/* New Farmers */}
          <HighlightCard
            label="New Farmers"
            Icon={UserPlus}
            iconColor={C.info}
            iconBg={C.infoLight}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Farms by Ecosystem (simplified donut) */}
        <div style={card}>
          <SectionHeader
            title="Farms by Ecosystem"
            sub="How active farms split across the three ecosystem types"
          />
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 168, height: 168, flexShrink: 0 }}>
              {ecosystemPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ecosystemPie}
                        cx="50%" cy="50%"
                        innerRadius={58} outerRadius={82}
                        dataKey="value"
                        stroke={C.surface} strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {ecosystemPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1 }}>{ecoTotal}</p>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>farms</p>
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 12 }}>
                  No farms yet
                </div>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ecosystemPie.length > 0
                ? ecosystemPie.map(e => {
                    const pct = ecoTotal ? Math.round((e.value / ecoTotal) * 100) : 0;
                    return (
                      <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: e.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{e.label}</span>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {e.value}
                        </span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })
                : <p style={{ fontSize: 13, color: '#9CA3AF' }}>No farms registered yet.</p>}
            </div>
          </div>
        </div>

        {/* Top Recommended Varieties — leaderboard-style horizontal bars */}
        <div style={card}>
          <SectionHeader
            title="Top Recommended Varieties"
            sub="The varieties appearing most often in the engine's top-3 picks"
          />
          <div style={{ padding: '12px 24px 16px', display: 'flex', flexDirection: 'column' }}>
            {topVarietiesBar.length > 0 ? topVarietiesBar.map((v, i) => {
              // Show common_name only when it differs from nsic_code,
              // otherwise nsic_code alone is enough.
              const name = (v.label && v.label !== v.nsic_code) ? v.label : v.nsic_code;

              // Medal styling for ranks 1–3; subdued for 4+.
              const MEDALS = [
                { bg: '#FEF3DC', color: '#B45309' },   // gold
                { bg: '#F3F4F6', color: '#6B7280' },   // silver
                { bg: '#FDEBD0', color: '#C2410C' },   // bronze
              ];
              const medal = MEDALS[i] || { bg: C.surfaceAlt, color: '#9CA3AF' };
              const isTop = i === 0;

              return (
                <div key={v.nsic_code || i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px',
                  margin: isTop ? '0 -10px' : 0,
                  borderRadius: isTop ? 10 : 0,
                  backgroundColor: isTop ? '#FEF3DC30' : 'transparent',
                  borderBottom: i < topVarietiesBar.length - 1 && !isTop ? `1px solid ${C.borderLight}` : 'none',
                }}>
                  {/* Rank medal */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: medal.bg, color: medal.color,
                    fontWeight: 800, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                    boxShadow: isTop ? '0 1px 4px rgba(180, 83, 9, 0.18)' : 'none',
                  }}>
                    {i + 1}
                  </div>

                  {/* Variety name (slightly bigger/bolder for #1) */}
                  <span style={{
                    fontSize: isTop ? 14 : 13,
                    color: C.text,
                    fontWeight: isTop ? 700 : 600,
                    flex: 1,
                  }}>
                    {name}
                  </span>

                  {/* Count */}
                  <span style={{
                    fontSize: isTop ? 14 : 13,
                    color: C.text,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {v.value}
                    <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11, marginLeft: 4 }}>recs</span>
                  </span>
                </div>
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
                { to: '/users',    label: 'Add User',            sub: 'Create a new farmer or admin account',     Icon: UserPlus,        color: C.info    },
                { to: '/datasets', label: 'Add Rice Variety',    sub: 'Register a new NSIC variety',              Icon: Plus,            color: C.primary },
                { to: '/rules',    label: 'Edit Suitability Rules', sub: 'Update FAO ranges and WLC weights',      Icon: SlidersHorizontal, color: C.accent  },
                { to: '/map',      label: 'View Farm Map',       sub: 'Geographic distribution of farms',         Icon: MapPin,          color: C.warning },
              ].map(a => (
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
                    backgroundColor: a.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <a.Icon size={14} color={a.color} />
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
                  {s.latency_ms != null && (
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'ui-monospace, monospace' }}>
                      {s.latency_ms} ms
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.ok ? C.success : C.error }}>
                    {s.status}
                  </span>
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
