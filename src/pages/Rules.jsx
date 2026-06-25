import { useState, useRef, useEffect } from 'react';
import { C } from '../theme';
import { api } from '../services/api';
import Skeleton, { SkeletonStyles } from '../components/Skeleton';
import {
  Search, SlidersHorizontal, Save, RotateCcw,
  CheckCircle2, AlertCircle, Lock, ChevronRight, Zap,
} from 'lucide-react';

const shadow      = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const baseCard    = { backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.borderLight}`, boxShadow: shadow };

const ECOSYSTEMS  = [
  { key: 'irrigated_lowland', label: 'Irrigated Lowland' },
  { key: 'rainfed_lowland',   label: 'Rainfed Lowland'   },
  { key: 'upland',            label: 'Upland'            },
];

/* -------------------------------------------------------------------------- */
/*  Defaults match apps/recommendations/scoring.py                            */
/* -------------------------------------------------------------------------- */

const DEFAULT_RULES = [
  // ── SOIL ────────────────────────────────────────────────────────────────
  {
    key: 'soil_ph', label: 'Soil pH', group: 'Soil', unit: 'pH', weight: 0.08,
    type: 'range',
    s1: { min: 5.5, max: 6.5 }, s2: { min: 5.0, max: 7.0 }, s3: { min: 4.5, max: 8.0 },
  },
  {
    key: 'soil_texture', label: 'Soil Texture', group: 'Soil', unit: 'texture class', weight: 0.10,
    type: 'categorical',
    options: [
      { value: 'clay',             score: 'S1' },
      { value: 'clay loam',        score: 'S1' },
      { value: 'silty clay',       score: 'S1' },
      { value: 'silt loam',        score: 'S2' },
      { value: 'silty clay loam',  score: 'S2' },
      { value: 'sandy loam',       score: 'S3' },
      { value: 'sandy clay loam',  score: 'S3' },
    ],
  },
  {
    key: 'organic_matter', label: 'Organic Matter', group: 'Soil', unit: '%', weight: 0.05,
    type: 'threshold',
    s1: 3.0, s2: 2.0, s3: 1.0,
  },
  {
    key: 'drainage', label: 'Drainage', group: 'Soil', unit: 'drainage class', weight: 0.07,
    type: 'ecosystem_categorical',
    perEcosystem: {
      irrigated_lowland: [
        { value: 'poorly drained',     score: 'S1' },
        { value: 'moderately drained', score: 'S2' },
        { value: 'well drained',       score: 'S3' },
      ],
      rainfed_lowland: [
        { value: 'poorly drained',     score: 'S1' },
        { value: 'moderately drained', score: 'S2' },
        { value: 'well drained',       score: 'S3' },
      ],
      upland: [
        { value: 'well drained',       score: 'S1' },
        { value: 'moderately drained', score: 'S2' },
        { value: 'poorly drained',     score: 'S3' },
      ],
    },
  },

  // ── CLIMATE ─────────────────────────────────────────────────────────────
  {
    key: 'avg_temperature', label: 'Average Temperature', group: 'Climate', unit: '°C', weight: 0.12,
    type: 'range',
    s1: { min: 24, max: 30 }, s2: { min: 22, max: 33 }, s3: { min: 20, max: 35 },
  },
  {
    key: 'seasonal_rainfall', label: 'Seasonal Rainfall', group: 'Climate', unit: 'mm', weight: 0.15,
    type: 'threshold',
    s1: 1000, s2: 700, s3: 500,
  },
  {
    key: 'humidity', label: 'Relative Humidity', group: 'Climate', unit: '%', weight: 0.04,
    type: 'range',
    s1: { min: 70, max: 90 }, s2: { min: 60, max: 95 }, s3: { min: 50, max: 100 },
  },
  {
    key: 'solar_radiation', label: 'Solar Radiation', group: 'Climate', unit: 'MJ/m²/day', weight: 0.06,
    type: 'threshold',
    s1: 18, s2: 15, s3: 12,
  },
  {
    key: 'temp_at_flowering', label: 'Temperature at Flowering', group: 'Climate', unit: '°C', weight: 0.08,
    type: 'range',
    s1: { min: 25, max: 30 }, s2: { min: 22, max: 33 }, s3: { min: 20, max: 35 },
  },

  // ── TOPOGRAPHY ──────────────────────────────────────────────────────────
  {
    key: 'elevation', label: 'Elevation', group: 'Topography', unit: 'm', weight: 0.08,
    type: 'ecosystem_threshold',
    perEcosystem: {
      irrigated_lowland: { s1: 300, s2: 600, s3: 1000 },
      rainfed_lowland:   { s1: 500, s2: 800, s3: 1000 },
      upland:            { s1: 1000, s2: 1500, s3: 2000 },
    },
  },
  {
    key: 'slope', label: 'Slope', group: 'Topography', unit: '%', weight: 0.07,
    type: 'ecosystem_threshold',
    perEcosystem: {
      irrigated_lowland: { s1: 2,  s2: 5,  s3: 8  },
      rainfed_lowland:   { s1: 3,  s2: 8,  s3: 15 },
      upland:            { s1: 15, s2: 25, s3: 35 },
    },
  },

  // ── VARIETY STRESS (derived) ────────────────────────────────────────────
  {
    key: 'stress_tolerance', label: 'Stress Tolerance', group: 'Variety', unit: 'derived', weight: 0.10,
    type: 'derived',
    description: 'Combines flood, drought, and salinity risk with the variety\'s tolerance profile. Cannot be edited directly — modify variety tolerances on the Datasets page instead.',
  },
];

const GROUPS = ['Soil', 'Climate', 'Topography', 'Variety'];

const CLASS_META = {
  S1: { label: 'Highly Suitable',     color: C.success },
  S2: { label: 'Moderately Suitable', color: C.accent  },
  S3: { label: 'Marginally Suitable', color: C.warning },
};

/* -------------------------------------------------------------------------- */
/*  Atoms                                                                     */
/* -------------------------------------------------------------------------- */

function NumberInput({ value, onChange, step = 0.1, width = 76 }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type="number"
      value={value}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width, height: 32, padding: '0 10px',
        fontSize: 13, fontWeight: 500,
        fontVariantNumeric: 'tabular-nums', textAlign: 'center',
        color: C.text,
        backgroundColor: focus ? C.surface : C.surfaceAlt,
        border: `1px solid ${focus ? C.primary : 'transparent'}`,
        borderRadius: 8, outline: 'none', fontFamily: 'inherit',
        transition: 'background-color 0.12s, border-color 0.12s',
      }}
    />
  );
}

function ClassTag({ cls }) {
  const meta = CLASS_META[cls];
  if (!meta) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: '#fff', backgroundColor: meta.color,
      padding: '2px 7px', borderRadius: 5,
      letterSpacing: '0.06em', minWidth: 22, textAlign: 'center',
    }}>
      {cls}
    </span>
  );
}

function TypeBadge({ type }) {
  const map = {
    range:                 'range',
    threshold:             'threshold',
    categorical:           'categorical',
    ecosystem_categorical: 'by ecosystem · categorical',
    ecosystem_threshold:   'by ecosystem · threshold',
    derived:               'derived',
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 500,
      color: '#9CA3AF', backgroundColor: C.surfaceAlt,
      padding: '3px 8px', borderRadius: 5,
      letterSpacing: '0.04em',
    }}>
      {map[type] || type}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card variants                                                             */
/* -------------------------------------------------------------------------- */

function CardShell({ rule, weight, onWeight, locked, children }) {
  return (
    <div style={{ ...baseCard, padding: 22 }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{rule.label}</p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
            {rule.unit}
          </p>
        </div>
        <TypeBadge type={rule.type} />
      </div>

      {children}

      {/* Weight footer */}
      <div style={{
        marginTop: 16, paddingTop: 14,
        borderTop: `1px solid ${C.borderLight}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', minWidth: 86 }}>
          WLC WEIGHT
        </span>
        {locked ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
            {weight.toFixed(2)}
          </span>
        ) : (
          <NumberInput value={weight} step={0.01} width={70} onChange={onWeight} />
        )}
        <span style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }}>of 1.00 total</span>
        {locked && <Lock size={11} color="#D1D5DB" />}
      </div>
    </div>
  );
}

function RangeBody({ rule, onChange }) {
  return (
    <div>
      {['s1', 's2', 's3'].map((cls, i, arr) => {
        const meta = CLASS_META[cls.toUpperCase()];
        return (
          <div key={cls} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '11px 2px',
            borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.borderLight}`,
          }}>
            <ClassTag cls={cls.toUpperCase()} />
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1 }}>{meta.label}</span>
            <NumberInput value={rule[cls].min} onChange={(v) => onChange(cls, 'min', v)} />
            <span style={{ fontSize: 13, color: '#D1D5DB' }}>—</span>
            <NumberInput value={rule[cls].max} onChange={(v) => onChange(cls, 'max', v)} />
          </div>
        );
      })}
    </div>
  );
}

function ThresholdBody({ rule, onChange }) {
  return (
    <div>
      {['s1', 's2', 's3'].map((cls, i, arr) => {
        const meta = CLASS_META[cls.toUpperCase()];
        return (
          <div key={cls} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '11px 2px',
            borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.borderLight}`,
          }}>
            <ClassTag cls={cls.toUpperCase()} />
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1 }}>{meta.label}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>at least</span>
            <NumberInput value={rule[cls]} onChange={(v) => onChange(cls, v)} />
          </div>
        );
      })}
    </div>
  );
}

function CategoricalBody({ options }) {
  return (
    <div>
      {options.map((opt, i) => (
        <div key={opt.value} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '11px 2px',
          borderBottom: i === options.length - 1 ? 'none' : `1px solid ${C.borderLight}`,
        }}>
          <ClassTag cls={opt.score} />
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>
            {opt.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function EcosystemTabs({ active, onSelect }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4, marginBottom: 12,
      backgroundColor: C.surfaceAlt, borderRadius: 9,
    }}>
      {ECOSYSTEMS.map(e => {
        const on = active === e.key;
        return (
          <button
            key={e.key}
            onClick={() => onSelect(e.key)}
            style={{
              flex: 1, padding: '7px 10px',
              fontSize: 12, fontWeight: 600,
              color: on ? C.text : '#9CA3AF',
              backgroundColor: on ? C.surface : 'transparent',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: on ? '0 1px 3px rgba(26,26,46,0.08)' : 'none',
              transition: 'background-color 0.12s',
            }}
          >
            {e.label}
          </button>
        );
      })}
    </div>
  );
}

function EcosystemThresholdBody({ rule, onChange }) {
  const [eco, setEco] = useState('irrigated_lowland');
  const data = rule.perEcosystem[eco];
  return (
    <div>
      <EcosystemTabs active={eco} onSelect={setEco} />
      {['s1', 's2', 's3'].map((cls, i, arr) => {
        const meta = CLASS_META[cls.toUpperCase()];
        return (
          <div key={cls} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '11px 2px',
            borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.borderLight}`,
          }}>
            <ClassTag cls={cls.toUpperCase()} />
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1 }}>{meta.label}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>at most</span>
            <NumberInput value={data[cls]} onChange={(v) => onChange(eco, cls, v)} />
          </div>
        );
      })}
    </div>
  );
}

function EcosystemCategoricalBody({ rule }) {
  const [eco, setEco] = useState('irrigated_lowland');
  const options = rule.perEcosystem[eco];
  return (
    <div>
      <EcosystemTabs active={eco} onSelect={setEco} />
      {options.map((opt, i) => (
        <div key={opt.value} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '11px 2px',
          borderBottom: i === options.length - 1 ? 'none' : `1px solid ${C.borderLight}`,
        }}>
          <ClassTag cls={opt.score} />
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>
            {opt.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DerivedBody({ rule }) {
  return (
    <div style={{
      padding: '14px 16px',
      backgroundColor: C.surfaceAlt,
      borderRadius: 10,
      display: 'flex', gap: 12,
    }}>
      <Lock size={14} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
      <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.55 }}>
        {rule.description}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card chooser                                                              */
/* -------------------------------------------------------------------------- */

function RuleCard({ rule, onChange }) {
  const onWeight = (v) => onChange({ ...rule, weight: v });
  const onRange  = (cls, key, v) => onChange({ ...rule, [cls]: { ...rule[cls], [key]: v } });
  const onThresh = (cls, v)      => onChange({ ...rule, [cls]: v });
  const onEcoThresh = (eco, cls, v) => onChange({
    ...rule,
    perEcosystem: { ...rule.perEcosystem, [eco]: { ...rule.perEcosystem[eco], [cls]: v } },
  });

  return (
    <CardShell rule={rule} weight={rule.weight} onWeight={onWeight} locked={rule.type === 'derived'}>
      {rule.type === 'range'                 && <RangeBody rule={rule} onChange={onRange} />}
      {rule.type === 'threshold'             && <ThresholdBody rule={rule} onChange={onThresh} />}
      {rule.type === 'categorical'           && <CategoricalBody options={rule.options} />}
      {rule.type === 'ecosystem_categorical' && <EcosystemCategoricalBody rule={rule} />}
      {rule.type === 'ecosystem_threshold'   && <EcosystemThresholdBody rule={rule} onChange={onEcoThresh} />}
      {rule.type === 'derived'               && <DerivedBody rule={rule} />}
    </CardShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dropdown (matches Users/Datasets)                                         */
/* -------------------------------------------------------------------------- */

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
          whiteSpace: 'nowrap', outline: 'none', minWidth: 160, position: 'relative',
        }}
      >
        {label}
        <ChevronRight size={13} color={open ? C.primary : '#9CA3AF'}
          style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? '-90deg' : '90deg'})`, transition: 'transform 0.15s' }}
        />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, backgroundColor: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(26,26,46,0.10)', minWidth: '100%', overflow: 'hidden' }}>
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            style={{ padding: '9px 14px', fontSize: 13, color: !value ? C.primary : '#9CA3AF', cursor: 'pointer', fontWeight: !value ? 600 : 400, backgroundColor: !value ? C.primaryLighter : 'transparent' }}
          >{placeholder}</div>
          {options.map(o => (
            <div key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: value === o.value ? C.primary : C.text, fontWeight: value === o.value ? 600 : 400, backgroundColor: value === o.value ? C.primaryLighter : 'transparent' }}
            >{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export default function Rules() {
  const [rules, setRules]         = useState(DEFAULT_RULES);
  const [search, setSearch]       = useState('');
  const [groupFilter, setGroup]   = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [savedMsg, setSavedMsg]   = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [source, setSource]       = useState('database');

  // Load the active ruleset from the backend on mount.
  useEffect(() => {
    let alive = true;
    api.rules()
      .then(data => {
        if (!alive) return;
        const incoming = data?.payload?.rules;
        if (Array.isArray(incoming) && incoming.length > 0) {
          setRules(incoming);
        }
        if (data?.updated_at)      setLastSaved(new Date(data.updated_at));
        if (data?.source)          setSource(data.source);
      })
      .catch(err => {
        console.warn('Could not load rules from backend; using defaults.', err);
        setSavedMsg('Offline — showing default rules.');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const totalWeight = rules.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);
  const weightOk    = Math.abs(totalWeight - 1.0) < 0.005;

  const filtered = rules.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)) &&
      (!groupFilter || r.group === groupFilter)
    );
  });

  const handleChange = (key, updated) => {
    setRules(prev => prev.map(r => (r.key === key ? updated : r)));
    setSavedMsg('');
  };

  const handleReset = () => {
    setRules(DEFAULT_RULES);
    setSavedMsg('Reverted to default ranges (not yet saved).');
  };

  const handleSave = async () => {
    if (!weightOk) {
      setSavedMsg('Cannot save — weights must sum to 1.00.');
      return;
    }
    setSaving(true);
    setSavedMsg('');
    try {
      const data = await api.saveRules({ rules });
      if (data?.updated_at) setLastSaved(new Date(data.updated_at));
      if (data?.source)     setSource(data.source);
      setSavedMsg('Saved · effective immediately for new scans.');
    } catch (err) {
      setSavedMsg(err?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28, backgroundColor: C.background, minHeight: '100vh' }}>
        <SkeletonStyles />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={210} height={22} radius={6} />
            <Skeleton width={420} height={13} radius={4} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={86} height={36} radius={10} />
            <Skeleton width={140} height={36} radius={10} />
          </div>
        </div>
        <Skeleton width="100%" height={46} radius={12} />
        <Skeleton width="100%" height={56} radius={12} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...baseCard, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skeleton width={130} height={14} radius={4} />
                  <Skeleton width={80} height={10} radius={3} />
                </div>
                <Skeleton width={60} height={18} radius={5} />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} style={{ padding: '10px 0', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton width={26} height={18} radius={5} />
                  <Skeleton width={140} height={12} radius={4} />
                  <div style={{ flex: 1 }} />
                  <Skeleton width={70} height={32} radius={8} />
                  <Skeleton width={70} height={32} radius={8} />
                </div>
              ))}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton width={86} height={11} radius={3} />
                <Skeleton width={70} height={28} radius={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28, backgroundColor: C.background, minHeight: '100vh' }}>
      <SkeletonStyles />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Suitability Rules</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            FAO suitability ranges and Weighted Linear Combination weights used by the rule-based RSI engine.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#9CA3AF', fontSize: 12,
          }}>
            <Zap size={12} color={C.primary} />
            <span>Effective immediately for new scans</span>
          </div>
          <button onClick={handleReset}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: C.surface, color: C.textSecondary,
              border: `1px solid ${C.borderLight}`, borderRadius: 10,
              padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <RotateCcw size={14} />
            Reset
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: (saving || loading) ? C.surfaceAlt : C.primary,
              color: (saving || loading) ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 10,
              padding: '9px 16px', fontSize: 13, fontWeight: 600,
              cursor: (saving || loading) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Compact summary strip ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 28,
        padding: '14px 20px',
        backgroundColor: C.surface,
        borderRadius: 12,
        border: `1px solid ${C.borderLight}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{rules.length}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>factors</span>
        </div>
        <div style={{ width: 1, height: 22, backgroundColor: C.borderLight }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {weightOk
            ? <CheckCircle2 size={14} color={C.success} />
            : <AlertCircle size={14} color={C.error} />}
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
            Weight {totalWeight.toFixed(2)} <span style={{ color: '#9CA3AF', fontWeight: 400 }}>/ 1.00</span>
          </span>
        </div>
        <div style={{ width: 1, height: 22, backgroundColor: C.borderLight }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Last saved</span>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
            {lastSaved ? lastSaved.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
          </span>
        </div>
        <div style={{ width: 1, height: 22, backgroundColor: C.borderLight }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            backgroundColor: source === 'database' ? C.success : '#D1D5DB',
          }} />
          <span style={{ fontSize: 12, color: source === 'database' ? C.success : '#9CA3AF', fontWeight: 600 }}>
            {source === 'database' ? 'Live · database' : 'Fallback · defaults'}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {savedMsg && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: savedMsg.startsWith('Saved') || savedMsg.startsWith('Rev') ? C.success : C.error,
            maxWidth: 480, textAlign: 'right', lineHeight: 1.45,
          }}>
            {savedMsg}
          </span>
        )}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: C.surface, borderRadius: 12,
        border: `1px solid ${C.borderLight}`,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search factor…"
            style={{ paddingLeft: 32, paddingRight: 12, height: 36, width: '100%', fontSize: 13, border: `1px solid ${C.borderLight}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: C.text, backgroundColor: C.surface }}
          />
        </div>
        <Dropdown value={groupFilter} onChange={setGroup}
          placeholder="All Groups"
          options={GROUPS.map(g => ({ value: g, label: g }))}
        />
      </div>

      {/* ── Grouped sections ──────────────────────────────────────────── */}
      {GROUPS.map(group => {
        const inGroup = filtered.filter(r => r.group === group);
        if (inGroup.length === 0) return null;
        const groupWeight = inGroup.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0);

        return (
          <section key={group} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Group header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              paddingLeft: 4,
            }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: C.textSecondary,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                {group}
              </p>
              <div style={{ flex: 1, height: 1, backgroundColor: C.borderLight }} />
              <p style={{ fontSize: 11, color: '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>
                {inGroup.length} {inGroup.length === 1 ? 'factor' : 'factors'} · weight {groupWeight.toFixed(2)}
              </p>
            </div>

            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
              {inGroup.map(rule => (
                <RuleCard key={rule.key} rule={rule}
                  onChange={(updated) => handleChange(rule.key, updated)} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div style={{
          ...baseCard,
          padding: '60px 24px', textAlign: 'center',
        }}>
          <SlidersHorizontal size={28} color="#D1D5DB" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>No factors match your search.</p>
        </div>
      )}
    </div>
  );
}
