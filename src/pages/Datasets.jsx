import { useState, useRef, useEffect } from 'react';
import { C } from '../theme';
import { api } from '../services/api';
import { SkeletonStyles, SkelTableRow } from '../components/Skeleton';
import {
  Search, Pencil, Trash2, Plus, Database, Sprout, CheckCircle2,
  ChevronLeft, ChevronRight, X, AlertTriangle, Leaf, Download,
} from 'lucide-react';

const PAGE_SIZE = 10;

const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const card   = { backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}`, overflow: 'hidden' };
const th     = { padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.borderLight}`, backgroundColor: C.surfaceAlt };

const ECOSYSTEMS = [
  { value: 'irrigated_lowland', label: 'Irrigated Lowland' },
  { value: 'rainfed_lowland',   label: 'Rainfed Lowland'   },
  { value: 'upland',            label: 'Upland'            },
];
/* Quote a CSV cell only when it needs it: a value containing a comma,
   double-quote or newline is wrapped, and embedded quotes are doubled
   (RFC 4180). Keeps the file readable while staying Excel-safe. */
function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* Local (not UTC) yyyy-mm-dd, so a late-evening export isn't stamped
   with tomorrow's date. */
function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const TOLERANCES = [
  { value: 'low',      label: 'Low'      },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high',     label: 'High'     },
];

const ECO_STYLE = {
  irrigated_lowland: { bg: '#DBEAFE', color: '#1D4ED8' },
  rainfed_lowland:   { bg: '#CCFBF1', color: '#0F766E' },
  upland:            { bg: '#FEF3C7', color: '#D97706' },
};

const TOL_STYLE = {
  low:      { bg: C.surfaceAlt, color: '#9CA3AF' },
  moderate: { bg: C.infoLight,  color: C.info    },
  high:     { bg: C.successLight, color: C.success },
};

const BLANK_FORM = {
  variety_id:            '',
  nsic_code:             '',
  common_name:           '',
  ecosystem:             'irrigated_lowland',
  season:                'Wet/Dry',
  maturity_days:         110,
  avg_yield_t_ha:        5.0,
  max_yield_t_ha:        7.0,
  plant_height_cm:       100,
  grain_type:            'Long',
  amylose_pct:           20.0,
  submergence_tolerance: 'low',
  drought_tolerance:     'low',
  salinity_tolerance:    'low',
  pest_resistance:       '',
  disease_resistance:    '',
  optimal_temp_min:      22.0,
  optimal_temp_max:      35.0,
  optimal_rainfall_min:  1200,
  pagasa_climate_types:  'IV',
  year_released:         null,
  notes:                 '',
  is_active:             true,
};

/* -------------------------------------------------------------------------- */
/*  Atoms                                                                     */
/* -------------------------------------------------------------------------- */

function Dropdown({ value, onChange, options, placeholder, minWidth = 160 }) {
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
          whiteSpace: 'nowrap', outline: 'none', minWidth, position: 'relative',
          width: '100%', justifyContent: 'flex-start',
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

function StatCard({ label, value, unit, badge, green, Icon }) {
  return (
    <div style={{ backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}`, padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>{label}</p>
        <Icon size={14} color="#D1D5DB" />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 12 }}>
        <p style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: C.text }}>{value}</p>
        {unit && <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 3 }}>{unit}</p>}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: green ? C.successLight : C.surfaceAlt, color: green ? C.success : '#9CA3AF', borderRadius: 20, padding: '2px 9px' }}>
        {badge}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form input atoms (modal)                                                  */
/* -------------------------------------------------------------------------- */

function Field({ label, hint, children, full }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#9CA3AF' }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      placeholder={placeholder}
      style={{
        height: 36, padding: '0 12px', fontSize: 13,
        color: C.text, backgroundColor: C.surface,
        border: `1px solid ${C.borderLight}`, borderRadius: 8,
        outline: 'none', fontFamily: 'inherit',
      }}
      onFocus={e => e.target.style.border = `1px solid ${C.primary}`}
      onBlur={e => e.target.style.border = `1px solid ${C.borderLight}`}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 2 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        padding: 10, fontSize: 13, lineHeight: 1.5,
        color: C.text, backgroundColor: C.surface,
        border: `1px solid ${C.borderLight}`, borderRadius: 8,
        outline: 'none', resize: 'vertical', fontFamily: 'inherit',
      }}
      onFocus={e => e.target.style.border = `1px solid ${C.primary}`}
      onBlur={e => e.target.style.border = `1px solid ${C.borderLight}`}
    />
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Toggle({ value, onChange, labelOn = 'Active', labelOff = 'Inactive' }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 36, padding: '0 14px',
        backgroundColor: value ? C.successLight : C.surfaceAlt,
        border: `1px solid ${value ? C.success + '40' : C.borderLight}`,
        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 13, fontWeight: 600,
        color: value ? C.success : C.textSecondary,
        width: '100%', justifyContent: 'flex-start',
      }}>
      <span style={{
        width: 28, height: 16, borderRadius: 999,
        backgroundColor: value ? C.success : '#D1D5DB',
        position: 'relative', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2,
          left: value ? 14 : 2,
          width: 12, height: 12, borderRadius: '50%',
          backgroundColor: '#fff',
          transition: 'left 0.18s',
        }} />
      </span>
      {value ? labelOn : labelOff}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal: Create / Edit variety                                              */
/* -------------------------------------------------------------------------- */

function VarietyModal({ open, initial, onClose, onSaved }) {
  const [form, setForm]     = useState(initial || BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const editing = !!initial?.id;

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...BLANK_FORM, ...initial } : BLANK_FORM);
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Clean: send numbers as numbers, drop empties.
      const payload = {
        ...form,
        maturity_days:        Number(form.maturity_days)        || 0,
        avg_yield_t_ha:       Number(form.avg_yield_t_ha)       || 0,
        max_yield_t_ha:       Number(form.max_yield_t_ha)       || 0,
        plant_height_cm:      form.plant_height_cm === '' ? null : Number(form.plant_height_cm),
        amylose_pct:          form.amylose_pct === '' ? null : Number(form.amylose_pct),
        optimal_temp_min:     Number(form.optimal_temp_min)     || 0,
        optimal_temp_max:     Number(form.optimal_temp_max)     || 0,
        optimal_rainfall_min: Number(form.optimal_rainfall_min) || 0,
        year_released:        form.year_released === '' ? null : Number(form.year_released),
      };
      const saved = editing
        ? await api.updateVariety(initial.id, payload)
        : await api.createVariety(payload);
      onSaved(saved, editing);
      onClose();
    } catch (err) {
      setError(err?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(26,26,46,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        backgroundColor: C.surface, borderRadius: 16,
        boxShadow: '0 24px 48px rgba(26,26,46,0.25)',
        width: '100%', maxWidth: 720, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 26px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryLighter, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={16} color={C.primary} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                {editing ? 'Edit Rice Variety' : 'Add Rice Variety'}
              </p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                {editing ? `Updating ${initial.common_name}` : 'Add a new NSIC-registered variety'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: 'transparent', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="#9CA3AF" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 26, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Section title="Identification">
            <Field label="Variety ID *">
              <TextInput value={form.variety_id} onChange={v => set('variety_id', v)} placeholder="e.g. V001" />
            </Field>
            <Field label="NSIC Code *">
              <TextInput value={form.nsic_code} onChange={v => set('nsic_code', v)} placeholder="e.g. NSIC Rc222" />
            </Field>
            <Field label="Common Name *" full>
              <TextInput value={form.common_name} onChange={v => set('common_name', v)} placeholder="e.g. Tubigan 18" />
            </Field>
          </Section>

          <Section title="Classification">
            <Field label="Ecosystem *">
              <Dropdown value={form.ecosystem} onChange={v => set('ecosystem', v)} options={ECOSYSTEMS} placeholder="Choose ecosystem" />
            </Field>
            <Field label="Season">
              <TextInput value={form.season} onChange={v => set('season', v)} placeholder="e.g. Wet/Dry" />
            </Field>
            <Field label="Grain Type">
              <TextInput value={form.grain_type} onChange={v => set('grain_type', v)} placeholder="e.g. Long" />
            </Field>
            <Field label="Year Released">
              <TextInput type="number" value={form.year_released} onChange={v => set('year_released', v)} placeholder="e.g. 2010" />
            </Field>
          </Section>

          <Section title="Yield & Growth">
            <Field label="Maturity (days) *">
              <TextInput type="number" value={form.maturity_days} onChange={v => set('maturity_days', v)} />
            </Field>
            <Field label="Plant Height (cm)">
              <TextInput type="number" value={form.plant_height_cm} onChange={v => set('plant_height_cm', v)} />
            </Field>
            <Field label="Avg Yield (t/ha) *">
              <TextInput type="number" value={form.avg_yield_t_ha} onChange={v => set('avg_yield_t_ha', v)} />
            </Field>
            <Field label="Max Yield (t/ha) *">
              <TextInput type="number" value={form.max_yield_t_ha} onChange={v => set('max_yield_t_ha', v)} />
            </Field>
            <Field label="Amylose (%)">
              <TextInput type="number" value={form.amylose_pct} onChange={v => set('amylose_pct', v)} />
            </Field>
          </Section>

          <Section title="Stress Tolerances">
            <Field label="Submergence">
              <Dropdown value={form.submergence_tolerance} onChange={v => set('submergence_tolerance', v)} options={TOLERANCES} placeholder="Tolerance" />
            </Field>
            <Field label="Drought">
              <Dropdown value={form.drought_tolerance} onChange={v => set('drought_tolerance', v)} options={TOLERANCES} placeholder="Tolerance" />
            </Field>
            <Field label="Salinity" full>
              <Dropdown value={form.salinity_tolerance} onChange={v => set('salinity_tolerance', v)} options={TOLERANCES} placeholder="Tolerance" />
            </Field>
          </Section>

          <Section title="Optimal Conditions">
            <Field label="Optimal Temp Min (°C)">
              <TextInput type="number" value={form.optimal_temp_min} onChange={v => set('optimal_temp_min', v)} />
            </Field>
            <Field label="Optimal Temp Max (°C)">
              <TextInput type="number" value={form.optimal_temp_max} onChange={v => set('optimal_temp_max', v)} />
            </Field>
            <Field label="Optimal Rainfall Min (mm)">
              <TextInput type="number" value={form.optimal_rainfall_min} onChange={v => set('optimal_rainfall_min', v)} />
            </Field>
            <Field label="PAGASA Climate Type">
              <TextInput value={form.pagasa_climate_types} onChange={v => set('pagasa_climate_types', v)} placeholder="e.g. IV" />
            </Field>
          </Section>

          <Section title="Notes & Status">
            <Field label="Pest Resistance" full>
              <TextArea value={form.pest_resistance} onChange={v => set('pest_resistance', v)} placeholder="e.g. Moderately resistant to brown planthopper" />
            </Field>
            <Field label="Disease Resistance" full>
              <TextArea value={form.disease_resistance} onChange={v => set('disease_resistance', v)} placeholder="e.g. Resistant to tungro virus" />
            </Field>
            <Field label="Notes" full>
              <TextArea value={form.notes} onChange={v => set('notes', v)} placeholder="Additional notes" rows={3} />
            </Field>
            <Field label="Status" full>
              <Toggle value={form.is_active} onChange={v => set('is_active', v)} />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 26px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 12, backgroundColor: C.surfaceAlt }}>
          {error && (
            <p style={{ fontSize: 12, color: C.error, fontWeight: 600, flex: 1, lineHeight: 1.45, maxWidth: 380 }}>
              {error}
            </p>
          )}
          {!error && <div style={{ flex: 1 }} />}
          <button onClick={onClose} disabled={saving} style={{
            height: 38, padding: '0 16px', fontSize: 13, fontWeight: 600,
            color: C.textSecondary, backgroundColor: C.surface,
            border: `1px solid ${C.borderLight}`, borderRadius: 10,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            height: 38, padding: '0 18px', fontSize: 13, fontWeight: 600,
            color: '#fff', backgroundColor: saving ? '#9CA3AF' : C.primary,
            border: 'none', borderRadius: 10,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <CheckCircle2 size={14} />
            {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Variety')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Delete confirmation                                                        */
/* -------------------------------------------------------------------------- */

function DeleteConfirm({ variety, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  if (!variety) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 110,
      backgroundColor: 'rgba(26,26,46,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ backgroundColor: C.surface, borderRadius: 16, padding: 26, width: '100%', maxWidth: 420, boxShadow: '0 24px 48px rgba(26,26,46,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color={C.error} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Deactivate variety?</p>
            <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4, lineHeight: 1.55 }}>
              <strong>{variety.common_name}</strong> ({variety.nsic_code}) will be hidden from new
              recommendations. Existing recommendation history is preserved.
              You can reactivate it later from the Edit dialog.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} disabled={busy} style={{
            height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600,
            color: C.textSecondary, backgroundColor: C.surface,
            border: `1px solid ${C.borderLight}`, borderRadius: 9,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancel
          </button>
          <button onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }} disabled={busy} style={{
            height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600,
            color: '#fff', backgroundColor: busy ? '#9CA3AF' : C.error,
            border: 'none', borderRadius: 9,
            cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {busy ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                  */
/* -------------------------------------------------------------------------- */

export default function Datasets() {
  const [list,    setList]      = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [search,  setSearch]    = useState('');
  const [ecoFil,  setEcoFil]    = useState('');
  const [statFil, setStatFil]   = useState('');
  const [page,    setPage]      = useState(1);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing,   setEditing]     = useState(null);
  const [toDelete,  setToDelete]    = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.varieties();
      setList(Array.isArray(data) ? data : (data.results ?? []));
    } catch (err) {
      setError(err?.message || 'Failed to load varieties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = list.filter(v => {
    const q = search.toLowerCase();
    const matchQ = (v.common_name || '').toLowerCase().includes(q)
                || (v.nsic_code   || '').toLowerCase().includes(q)
                || (v.variety_id  || '').toLowerCase().includes(q);
    const matchE = !ecoFil  || v.ecosystem === ecoFil;
    const matchS = !statFil || (statFil === 'active' ? v.is_active : !v.is_active);
    return matchQ && matchE && matchS;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active     = list.filter(v => v.is_active).length;
  const inactive   = list.length - active;
  const avgYield   = list.length
    ? (list.reduce((s, v) => s + (v.avg_yield_t_ha || 0), 0) / list.length).toFixed(2)
    : '0.00';

  /* Exports exactly what the table is showing — every active filter
     applies, but not pagination, so all matching rows are included. */
  const handleExport = () => {
    if (!filtered.length) return;

    const ecoLabel = Object.fromEntries(ECOSYSTEMS.map(e => [e.value, e.label]));
    const headers = [
      'NSIC Code', 'Common Name', 'Ecosystem', 'Maturity (days)',
      'Average Yield (t/ha)', 'Maximum Yield (t/ha)', 'Status',
    ];
    const rows = filtered.map(v => [
      v.nsic_code,
      v.common_name,
      ecoLabel[v.ecosystem] || v.ecosystem,
      v.maturity_days,
      v.avg_yield_t_ha,
      v.max_yield_t_ha,
      v.is_active ? 'Active' : 'Inactive',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(csvCell).join(','))
      .join('\r\n');

    // Leading BOM so Excel opens it as UTF-8 rather than mangling accents.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `rice-varieties-${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaved = (saved, wasEditing) => {
    setList(prev => wasEditing
      ? prev.map(v => v.id === saved.id ? saved : v)
      : [saved, ...prev]
    );
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.deleteVariety(toDelete.id);
      setList(prev => prev.map(v => v.id === toDelete.id ? { ...v, is_active: false } : v));
    } catch (err) {
      setError(err?.message || 'Delete failed.');
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Rice Varieties</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            Manage the NSIC-registered rice variety dataset that feeds the recommendation engine.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            title={filtered.length
              ? `Export ${filtered.length} ${filtered.length === 1 ? 'variety' : 'varieties'} as CSV`
              : 'No varieties match the current filters'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: C.surface,
              color: filtered.length ? C.text : C.textTertiary,
              border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: '9px 16px',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              cursor: filtered.length ? 'pointer' : 'not-allowed',
              opacity: filtered.length ? 1 : 0.6,
            }}>
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: C.primary, color: '#fff',
              border: 'none', borderRadius: 10, padding: '9px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <Plus size={14} />
            Add Variety
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Total Varieties" value={list.length} unit="varieties" badge={`${active} active`} green={true} Icon={Database} />
        <StatCard label="Avg Yield"       value={avgYield}    unit="t/ha"     badge="across active varieties" green={true} Icon={Sprout} />
        <StatCard label="Inactive"        value={inactive}    unit="varieties" badge={inactive > 0 ? `${inactive} hidden` : 'all active'} green={false} Icon={CheckCircle2} />
      </div>

      {/* Filter bar */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, NSIC code, or variety ID…"
            style={{ paddingLeft: 32, paddingRight: 12, height: 36, width: '100%', fontSize: 13, border: `1px solid ${C.borderLight}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: C.text, backgroundColor: C.surface }}
          />
        </div>
        <Dropdown value={ecoFil}  onChange={v => { setEcoFil(v);  setPage(1); }} options={[{ value: '', label: 'All Ecosystems' }, ...ECOSYSTEMS]} placeholder="All Ecosystems" />
        <Dropdown value={statFil} onChange={v => { setStatFil(v); setPage(1); }} options={[{ value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} placeholder="All Statuses" />
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          ...card, padding: '14px 20px',
          borderLeft: `3px solid ${C.error}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={16} color={C.error} />
          <p style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {/* Table */}
      <div style={card}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Variety Dataset</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {loading
                ? 'Loading…'
                : `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} · ${active} active`}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: C.primaryLighter, color: C.primary }}>
            live · database
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Variety</th>
              <th style={th}>Ecosystem</th>
              <th style={{ ...th, textAlign: 'right' }}>Maturity</th>
              <th style={{ ...th, textAlign: 'right' }}>Avg Yield</th>
              <th style={th}>Tolerances</th>
              <th style={{ ...th, textAlign: 'center' }}>Status</th>
              <th style={{ ...th, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(v => {
              const eco = ECO_STYLE[v.ecosystem] ?? { bg: C.surfaceAlt, color: '#9CA3AF' };
              return (
                <tr key={v.id} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.primaryLighter, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Leaf size={13} color={C.primary} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: C.text }}>{v.common_name}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{v.nsic_code}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: eco.bg, color: eco.color, textTransform: 'capitalize' }}>
                      {(v.ecosystem || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                    {v.maturity_days} <span style={{ color: '#9CA3AF', fontSize: 11 }}>days</span>
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {Number(v.avg_yield_t_ha || 0).toFixed(2)}
                    <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 400 }}> t/ha</span>
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[
                        { key: 'submergence', val: v.submergence_tolerance, lbl: 'Sub' },
                        { key: 'drought',     val: v.drought_tolerance,     lbl: 'Dro' },
                        { key: 'salinity',    val: v.salinity_tolerance,    lbl: 'Sal' },
                      ].map(t => {
                        const s = TOL_STYLE[t.val] ?? TOL_STYLE.low;
                        return (
                          <span key={t.key} title={`${t.lbl}: ${t.val}`} style={{
                            fontSize: 10, fontWeight: 700,
                            padding: '3px 7px', borderRadius: 5,
                            backgroundColor: s.bg, color: s.color,
                            letterSpacing: '0.04em',
                          }}>
                            {t.lbl}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: v.is_active ? C.success : '#D1D5DB' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: v.is_active ? C.success : '#9CA3AF' }}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <button title="Edit" onClick={() => { setEditing(v); setModalOpen(true); }} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={13} color="#6B7280" />
                      </button>
                      <button title="Deactivate" onClick={() => setToDelete(v)} disabled={!v.is_active} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: v.is_active ? 'pointer' : 'not-allowed', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: v.is_active ? 1 : 0.35 }}>
                        <Trash2 size={13} color={C.error} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading && Array.from({ length: 5 }).map((_, i) => <SkelTableRow key={`sk-${i}`} cells={7} />)}
            {!loading && paginated.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '52px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                {filtered.length === 0 ? 'No varieties match your search.' : 'No varieties on this page.'}
              </td></tr>
            )}
          </tbody>
        </table>

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

      <VarietyModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
      <DeleteConfirm
        variety={toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
