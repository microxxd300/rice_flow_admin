import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, Bug, MapPinOff, Wheat, Clock, UserPlus, MapPin, Sparkles,
  ArrowUpRight, Activity,
} from 'lucide-react';
import { C, cardShadow } from '../theme';
import { emptyPic, ecosystemPic } from '../assets/pictures';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../permissions';
import { timeAgo } from '../timeAgo';
import { seasonProgress } from '../season';
import ChangeList from '../components/ChangeList';
import Skeleton, { SkeletonStyles } from '../components/Skeleton';
import panaboMap from '../assets/brand/panabo_map.svg';
import noHarvest from '../assets/empty/no_harvest.png';
import s01 from '../assets/growth/stage_01.png';
import s02 from '../assets/growth/stage_02.png';
import s03 from '../assets/growth/stage_03.png';
import s04 from '../assets/growth/stage_04.png';
import s05 from '../assets/growth/stage_05.png';
import s06 from '../assets/growth/stage_06.png';
import s07 from '../assets/growth/stage_07.png';
import s08 from '../assets/growth/stage_08.png';
import s09 from '../assets/growth/stage_09.png';
import s10 from '../assets/growth/stage_10.png';

const STAGE_PICS = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10];
// Short names that fit under a picture (the server's full names go in the tooltip)
const STAGE_SHORT = ['Seedling', 'Young', 'Tillering', 'Stem', 'Booting', 'Flowering',
  'Grain fill', 'Ripening', 'Harvest', 'After'];

// Panabo's bounds, the same box panabo_map.svg was drawn in (1000 × 1373, 10 px margin)
const MAP = { lon0: 125.541339, lon1: 125.713799, lat0: 7.220802, lat1: 7.455722, w: 1000, h: 1373 };
const toMap = (lat, lon) => ({
  x: ((lon - MAP.lon0) / (MAP.lon1 - MAP.lon0) * MAP.w + 10) / (MAP.w + 20) * 100,
  y: ((MAP.lat1 - lat) / (MAP.lat1 - MAP.lat0) * MAP.h + 10) / (MAP.h + 20) * 100,
});

const ATTENTION = [
  { key: 'late_steps',      title: 'Late on a guide step', Icon: Clock,         tone: ['#FEF3DC', '#B45309'], to: '/farms',
    detail: r => `${r.step} · ${r.days_late} days late` },
  { key: 'problems',        title: 'Problems this week',   Icon: Bug,           tone: ['#FDECEC', '#DC2626'], to: '/farms',
    detail: r => `${r.issue_label}${r.severity ? ` · ${r.severity}` : ''}${r.note ? ` · “${r.note}”` : ''}` },
  { key: 'flagged_pins',    title: 'Pins to check',        Icon: MapPinOff,     tone: ['#EAF1FD', '#2563EB'], to: '/map',
    detail: r => `${PIN_LABEL[r.flag] || r.flag}${r.kept ? ' · farmer kept it' : ''}` },
  { key: 'harvest_overdue', title: 'Harvest not recorded', Icon: Wheat,         tone: ['#E8F5EF', '#047857'], to: '/farms',
    detail: r => `${r.variety ? `${r.variety} · ` : ''}${r.days_over} days past the harvest date` },
];
const PIN_LABEL = { built_up: 'In a built-up area', on_building: 'On a building', water: 'In water', mangrove: 'In mangrove' };

const EVENT_ICON = { user_registered: UserPlus, farm_pinned: MapPin, recommendation: Sparkles, yield_logged: Wheat };

const card = { backgroundColor: C.surface, borderRadius: 24, boxShadow: cardShadow };

function CardHead({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</p>
        {sub && <p style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 3 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Figure({ value, unit, label }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>{label}</p>
      <p style={{ marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: C.text }}>{value}</span>
        {unit && <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginLeft: 4 }}>{unit}</span>}
      </p>
    </div>
  );
}

/**
 * The season board. What an agriculturist needs each morning, in this order: where the
 * season is, how many crops are at each growth stage, the farms that need attention
 * (with where they are), then yield and what farmers plant, and what changed.
 */
export default function Dashboard() {
  const { role } = useAuth();
  const admin = isAdmin(role);
  const [stats,   setStats]   = useState(null);
  const [board,   setBoard]   = useState(null);
  const [farms,   setFarms]   = useState([]);
  const [model,   setModel]   = useState(undefined);
  const [health,  setHealth]  = useState(null);
  const [changes, setChanges] = useState(null);
  const [tab,     setTab]     = useState('late_steps');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState(null);
  const season = seasonProgress();

  const loadAll = async ({ silent = false } = {}) => {
    if (!silent) { setRefreshing(true); api.invalidate(); }
    try {
      // The services check pings every outside API and is slow: it fills in its line on
      // its own instead of holding the whole board back
      api.systemHealth().then(setHealth).catch(() => {});
      const [st, sb, fm, md, ch] = await Promise.allSettled([
        api.stats(), api.seasonBoard(), api.farms(), api.models(),
        admin ? api.changesPreview() : Promise.resolve(null),
      ]);
      if (st.status === 'fulfilled') setStats(st.value);
      if (sb.status === 'fulfilled') setBoard(sb.value);
      if (fm.status === 'fulfilled') setFarms(fm.value);
      if (md.status === 'fulfilled') setModel((Array.isArray(md.value) ? md.value : []).find(m => m.is_active) ?? null);
      if (ch.status === 'fulfilled' && Array.isArray(ch.value)) setChanges(ch.value);
      setUpdated(new Date());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on open; the role is fixed for the session
  useEffect(() => { loadAll({ silent: true }); }, []);

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SkeletonStyles />
        <Skeleton width={260} height={28} radius={8} />
        <Skeleton width="100%" height={120} radius={24} />
        <Skeleton width="100%" height={190} radius={24} />
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
          <Skeleton width="100%" height={340} radius={24} />
          <Skeleton width="100%" height={340} radius={24} />
        </div>
      </div>
    );
  }

  const att = board?.attention ?? {};
  const needIds = new Set(Object.values(att).flatMap(l => (l?.items ?? []).map(r => r.farm_id)));
  const attentionTotal = Object.values(att).reduce((n, l) => n + (l?.count ?? 0), 0);
  const stages = board?.stages ?? [];
  const maxStage = Math.max(1, ...stages.map(s => s.count));
  const current = ATTENTION.find(a => a.key === tab) ?? ATTENTION[0];
  // Five rows keep the list beside the map; the rest are counted below it
  const rows = (att[current.key]?.items ?? []).slice(0, 5);
  const servicesDown = (health?.services ?? []).filter(s => !s.ok).length;
  const events = (stats?.recent_activity ?? []).slice(0, 6);
  const topVarieties = (stats?.top_varieties ?? []).slice(0, 4);
  const maxPicks = Math.max(1, ...topVarieties.map(v => v.rec_count || 0));
  const pinned = farms.filter(f => f.latitude != null && f.longitude != null && f.is_active !== false);
  const topBarangays = Object.entries(pinned.reduce((m, f) => {
    const b = f.barangay || 'No barangay';
    m[b] = (m[b] || 0) + 1;
    return m;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div style={{ padding: '30px 36px 40px', display: 'flex', flexDirection: 'column', gap: 18, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>Panabo City · {season.label}</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', color: C.text, marginTop: 2 }}>Season board</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* The services, in one line (the full list is under the dot's tooltip) */}
          <span
            title={(health?.services ?? []).map(s => `${s.label}: ${s.ok ? 'ok' : 'down'}`).join('\n')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSecondary, padding: '8px 12px', borderRadius: 12, backgroundColor: C.surface }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: !health ? C.textTertiary : servicesDown ? C.error : C.primary }} />
            {!health ? 'Checking services…' : servicesDown ? `${servicesDown} service${servicesDown > 1 ? 's' : ''} down` : 'All services up'}
          </span>
          {updated && <span style={{ fontSize: 12, color: C.textTertiary }}>Updated {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button
            onClick={() => loadAll()} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', borderRadius: 14, border: 'none', backgroundColor: C.ink, color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
          >
            <RefreshCw size={15} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </button>
        </div>
      </div>

      {/* A bento: the to-do list is the big tile, the map a tall one beside it */}
      <style>{`
        .bento { display: grid; gap: 18px; grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-template-areas:
            "season season season season"
            "stages stages stages stages"
            "attn attn attn map"
            "yield yield vars vars"
            "activity activity ${admin ? 'changes changes' : 'activity activity'}"; }
        @media (max-width: 1200px) {
          .bento { grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-areas: "season season" "stages stages" "attn map" "yield vars"
              "${admin ? 'activity changes' : 'activity activity'}"; }
        }
      `}</style>
      <div className="bento">

      {/* ── The season and the numbers that size it ── */}
      <div style={{ ...card, gridArea: 'season', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)', gap: 24, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
            <span>{season.kind === 'wet' ? 'May' : 'November'}</span>
            <span style={{ color: C.text, fontWeight: 700 }}>Week {season.week}</span>
            <span>{season.kind === 'wet' ? 'October' : 'April'}</span>
          </div>
          <div style={{ position: 'relative', height: 12, borderRadius: 6, backgroundColor: C.background, marginTop: 10 }}>
            <div style={{ width: `${Math.round(season.share * 100)}%`, height: '100%', borderRadius: 6, backgroundColor: C.primary }} />
            <span style={{ position: 'absolute', top: -4, left: `calc(${Math.round(season.share * 100)}% - 10px)`, width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, border: '3px solid #fff' }} title="Today" />
          </div>
        </div>
        <Figure label="Crops growing" value={board?.active_crops ?? 0} />
        <Figure label="Farmers" value={stats?.total_users ?? 0} />
        <Figure label="Area farmed" value={(stats?.total_hectares ?? 0).toLocaleString()} unit="ha" />
        <Figure label="Needs attention" value={attentionTotal} unit={attentionTotal === 1 ? 'item' : 'items'} />
      </div>

      {/* ── Crops at each growth stage ── */}
      <div style={{ ...card, gridArea: 'stages', padding: '20px 24px' }}>
        <CardHead title="Crops at each stage" sub="Each active crop, by its age or the guide steps the farmer logged" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8 }}>
          {stages.map((s, i) => {
            const on = s.count > 0;
            return (
              <div key={s.stage_no} title={s.name} style={{
                borderRadius: 18, padding: '12px 6px 10px', textAlign: 'center',
                backgroundColor: on ? C.primaryLighter : C.background, opacity: on ? 1 : 0.55,
              }}>
                <img src={STAGE_PICS[i]} alt="" style={{ width: '70%', maxWidth: 64, aspectRatio: '1', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                <p style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{s.count}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{STAGE_SHORT[i]}</p>
                <div style={{ height: 4, borderRadius: 2, backgroundColor: '#fff', margin: '8px 8px 0', overflow: 'hidden' }}>
                  <div style={{ width: `${(s.count / maxStage) * 100}%`, height: '100%', backgroundColor: C.primary }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Needs attention, and where ── */}
        <div style={{ ...card, gridArea: 'attn', padding: '20px 24px' }}>
          <CardHead title="Needs attention" sub="The agriculturist's list: worst first" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {ATTENTION.map(a => {
              const on = tab === a.key;
              const n = att[a.key]?.count ?? 0;
              return (
                <button key={a.key} onClick={() => setTab(a.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', borderRadius: 12, border: 'none',
                  backgroundColor: on ? C.ink : C.background, color: on ? '#fff' : C.text, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                }}>
                  <a.Icon size={15} color={on ? '#34D399' : a.tone[1]} />
                  {a.title}
                  <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, backgroundColor: on ? '#374151' : '#fff', color: on ? '#fff' : C.text }}>{n}</span>
                </button>
              );
            })}
          </div>

          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '22px 0' }}>
              <img src={emptyPic('all_on_track')} alt="" style={{ width: 110, height: 110, objectFit: 'contain' }} />
              <p style={{ fontSize: 13.5, fontWeight: 600, color: C.textSecondary, marginTop: 6 }}>Nothing here. Every farm is on track.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(r => (
                <Link key={`${current.key}-${r.farm_id}-${r.date ?? ''}-${r.step ?? ''}`} to={current.to} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, backgroundColor: C.background,
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: current.tone[0], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <current.Icon size={18} color={current.tone[1]} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.farm} <span style={{ fontWeight: 500, color: C.textSecondary }}>· {r.farmer}{r.barangay ? `, ${r.barangay}` : ''}</span>
                    </p>
                    <p style={{ fontSize: 12.5, color: '#374151', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.detail(r)}</p>
                  </div>
                  <ArrowUpRight size={16} color={C.textTertiary} />
                </Link>
              ))}
              {(att[current.key]?.count ?? 0) > rows.length && (
                <p style={{ fontSize: 12, color: C.textSecondary, paddingLeft: 4 }}>
                  And {att[current.key].count - rows.length} more.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Where the farms are: green dots, red ones need attention */}
        <Link to="/map" style={{ ...card, gridArea: 'map', padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <CardHead
            title="Where"
            sub={`${pinned.length} farms pinned · red needs attention`}
            right={<ArrowUpRight size={18} color={C.textSecondary} />}
          />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 300, aspectRatio: `${MAP.w + 20} / ${MAP.h + 20}` }}>
              <img src={panaboMap} alt="Panabo City" style={{ width: '100%', height: '100%', display: 'block' }} />
              {pinned.map(f => {
                const p = toMap(Number(f.latitude), Number(f.longitude));
                if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null;
                const hot = needIds.has(f.id);
                return (
                  <span key={f.id} title={f.name} style={{
                    position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: hot ? 12 : 9, height: hot ? 12 : 9,
                    marginLeft: hot ? -6 : -4.5, marginTop: hot ? -6 : -4.5, borderRadius: '50%',
                    backgroundColor: hot ? C.error : C.primary, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                  }} />
                );
              })}
            </div>
          </div>
          {/* Where most farms are */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topBarangays.map(([name, n]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                <div style={{ width: 70, height: 6, borderRadius: 3, backgroundColor: C.background, overflow: 'hidden' }}>
                  <div style={{ width: `${(n / topBarangays[0][1]) * 100}%`, height: '100%', backgroundColor: C.primary }} />
                </div>
                <span style={{ width: 18, textAlign: 'right', fontSize: 12, color: C.textSecondary }}>{n}</span>
              </div>
            ))}
          </div>
        </Link>

      {/* ── Yield and what farmers plant ── */}
        <div style={{ ...card, gridArea: 'yield', padding: '20px 24px' }}>
          <CardHead title="Yield" sub="Harvests farmers recorded, and the yield model" />
          {(stats?.yield_records ?? 0) === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src={noHarvest} alt="" style={{ width: 84, height: 84, objectFit: 'contain' }} />
              <p style={{ fontSize: 13.5, color: C.textSecondary, fontWeight: 600 }}>No harvest recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 14 }}>
              <Figure label="Average yield" value={Number(stats.avg_yield_t_ha).toFixed(1)} unit="t/ha" />
              <Figure label="Harvests" value={stats.yield_records} />
              <Figure label="Total harvest" value={Number(stats.total_harvest_t).toFixed(1)} unit="t" />
            </div>
          )}
          <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 16, backgroundColor: C.background }}>
            {model === undefined && <p style={{ fontSize: 12.5, color: C.textSecondary }}>Loading the model…</p>}
            {model === null && <p style={{ fontSize: 12.5, color: C.textSecondary }}>No trained yield model yet.</p>}
            {model && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Activity size={18} color={C.primary} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{model.model_type_display}</p>
                  <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                    Trained on {model.training_samples.toLocaleString()} harvests{model.trained_at ? ` · ${new Date(model.trained_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 12.5, color: C.text }}><b>R² {model.r2_score.toFixed(2)}</b></span>
                <span style={{ fontSize: 12.5, color: C.text }}><b>±{model.mae.toFixed(2)}</b> t/ha</span>
              </div>
            )}
          </div>
        </div>

        <Link to="/datasets" style={{ ...card, gridArea: 'vars', padding: '20px 24px', display: 'block' }}>
          <CardHead title="What the engine recommends" sub="Varieties in the most top-3 picks" right={<ArrowUpRight size={18} color={C.textSecondary} />} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topVarieties.map((v, i) => (
              <div key={v.nsic_code || v.common_name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 32, height: 32, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, backgroundColor: i === 0 ? C.ink : C.background, color: i === 0 ? '#fff' : C.text }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: C.text }}>
                      {ecosystemPic(v.ecosystem) && <img src={ecosystemPic(v.ecosystem)} alt="" title={(v.ecosystem || '').replace(/_/g, ' ')} style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.common_name}</span>
                    </span>
                    <span style={{ fontSize: 12.5, color: C.textSecondary, whiteSpace: 'nowrap' }}>{v.rec_count} picks · {Number(v.avg_yield_t_ha || 0).toFixed(1)} t/ha</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, backgroundColor: C.background, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${(v.rec_count / maxPicks) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: i === 0 ? C.primary : C.ink }} />
                  </div>
                </div>
              </div>
            ))}
            {topVarieties.length === 0 && <p style={{ fontSize: 13, color: C.textSecondary }}>No recommendations yet.</p>}
          </div>
        </Link>

      {/* ── What happened ── */}
        <div style={{ ...card, gridArea: 'activity', padding: '20px 24px' }}>
          <CardHead title="Farmer activity" sub="Sign-ups, farm pins, recommendations and harvests" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((e, i) => {
              const Icon = EVENT_ICON[e.type] || Activity;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: C.primaryLighter, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color={C.primary} />
                  </div>
                  <p style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <b>{e.actor}</b> {e.message}
                  </p>
                  <span style={{ fontSize: 12, color: C.textTertiary, whiteSpace: 'nowrap' }}>{timeAgo(e.when)}</span>
                </div>
              );
            })}
            {events.length === 0 && <p style={{ fontSize: 13, color: C.textSecondary }}>No activity yet.</p>}
          </div>
        </div>

        {admin && (
          <div style={{ ...card, gridArea: 'changes', padding: '20px 24px' }}>
            <CardHead
              title="Staff changes"
              sub="What the admin and validator edited"
              right={<Link to="/changes" style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textDecoration: 'underline' }}>All changes</Link>}
            />
            {changes === null
              ? <p style={{ fontSize: 13, color: C.textSecondary }}>Loading…</p>
              : <ChangeList rows={changes} expandable={false} />}
          </div>
        )}
      </div>

      {/* Problems loading the board itself */}
      {!board && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.error }}>
          <AlertTriangle size={15} /> The season board did not load. Try Refresh.
        </p>
      )}
    </div>
  );
}
