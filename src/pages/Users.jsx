import { useState, useRef, useEffect } from 'react';
import { C } from '../theme';
import { api } from '../services/api';
import { reverseGeocode, getCachedGeocode } from '../services/geocode';
import { SkeletonStyles, SkelTableRow } from '../components/Skeleton';
import {
  Search, UserCheck, UserX, Eye, Pencil, Trash2, Plus, Users as UsersIcon,
  UserCheck2, UserMinus, ChevronLeft, ChevronRight, X, Mail, Phone, MapPin,
  Shield, Calendar, Clock, Hash, AtSign, AlertCircle, AlertTriangle,
  CheckCircle2, KeyRound, Eye as EyeIcon, EyeOff,
} from 'lucide-react';

const PAGE_SIZE = 10;

const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const card   = { backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}`, overflow: 'hidden' };
const th     = { padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.borderLight}`, backgroundColor: C.surfaceAlt };

const AVATAR_COLORS = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452', '#6DC8EC', '#945FB9'];

/**
 * Collapse names that were stored with last_name = first_name
 * (e.g. "Juan Juan" → "Juan"). Defensive — backend already cleans
 * this, but keep it here so cached data also renders correctly.
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

const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

/* -------------------------------------------------------------------------- */
/*  Atoms                                                                     */
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: green ? C.successLight : C.errorLight, color: green ? C.success : C.error, borderRadius: 20, padding: '2px 9px' }}>
          {badge}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form atoms used by the create/edit modal                                  */
/* -------------------------------------------------------------------------- */

function Field({ label, hint, error, children, full }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
      {error
        ? <p style={{ fontSize: 11, color: C.error, fontWeight: 600 }}>{error}</p>
        : (hint && <p style={{ fontSize: 11, color: '#9CA3AF' }}>{hint}</p>)}
    </div>
  );
}

function TextInput({ value, onChange, type = 'text', placeholder, rightSlot }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: 36, padding: '0 12px', paddingRight: rightSlot ? 38 : 12,
          fontSize: 13, color: C.text, backgroundColor: C.surface,
          border: `1px solid ${C.borderLight}`, borderRadius: 8,
          outline: 'none', fontFamily: 'inherit', width: '100%',
        }}
        onFocus={e => e.target.style.border = `1px solid ${C.primary}`}
        onBlur={e => e.target.style.border = `1px solid ${C.borderLight}`}
      />
      {rightSlot && (
        <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}>
          {rightSlot}
        </div>
      )}
    </div>
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

function RoleSelector({ value, onChange }) {
  const options = [
    { value: 'farmer',     label: 'Farmer',     desc: 'Mobile app access',         color: C.primary },
    { value: 'admin',      label: 'Admin',      desc: 'Admin dashboard access',    color: C.accent  },
    { value: 'superadmin', label: 'Superadmin', desc: 'Full system permissions',   color: C.error   },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: '12px 14px', textAlign: 'left',
              backgroundColor: on ? o.color + '15' : C.surface,
              border: `1px solid ${on ? o.color : C.borderLight}`,
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Shield size={12} color={on ? o.color : '#9CA3AF'} />
              <span style={{ fontSize: 13, fontWeight: 700, color: on ? o.color : C.text }}>
                {o.label}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF' }}>{o.desc}</p>
          </button>
        );
      })}
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
      <span style={{ width: 28, height: 16, borderRadius: 999, backgroundColor: value ? C.success : '#D1D5DB', position: 'relative', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 14 : 2, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.18s' }} />
      </span>
      {value ? labelOn : labelOff}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  User form modal — create / edit                                           */
/* -------------------------------------------------------------------------- */

const BLANK_USER = {
  username: '', email: '', first_name: '', last_name: '', phone: '',
  barangay: '', municipality: 'Panabo City', province: 'Davao del Norte',
  role: 'farmer', is_active: true, password: '',
};

function UserFormModal({ open, initial, onClose, onSaved }) {
  const editing = !!initial?.id;
  const [form, setForm]       = useState(BLANK_USER);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [showPw, setShowPw]   = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const role = initial.isSuperuser ? 'superadmin' : (initial.isStaff ? 'admin' : 'farmer');
      setForm({
        username:     initial.username || '',
        email:        initial.email || '',
        first_name:   initial.firstName || '',
        last_name:    initial.lastName || '',
        phone:        initial.phone || '',
        barangay:     initial.barangay || '',
        municipality: initial.municipality || 'Panabo City',
        province:     initial.province || 'Davao del Norte',
        role,
        is_active:    initial.status === 'Active',
        password:     '',
      });
    } else {
      setForm(BLANK_USER);
    }
    setError('');
    setShowPw(false);
  }, [open, initial]);

  if (!open) return null;
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      const saved = editing
        ? await api.updateUser(initial.id, payload)
        : await api.createUser(payload);
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
        width: '100%', maxWidth: 680, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 26px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryLighter, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UsersIcon size={16} color={C.primary} />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                {editing ? 'Edit User' : 'Add User'}
              </p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                {editing ? `Updating ${initial.name || initial.username}` : 'Create a new account'}
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
          <Section title="Credentials">
            <Field label="Username *" hint="Used to log in. Letters, numbers, dots allowed.">
              <TextInput value={form.username} onChange={v => set('username', v)} placeholder="e.g. juandelacruz" />
            </Field>
            <Field label="Email *">
              <TextInput type="email" value={form.email} onChange={v => set('email', v)} placeholder="juan@example.com" />
            </Field>
            <Field full label={editing ? 'New Password' : 'Password *'} hint={editing ? 'Leave blank to keep the current password.' : 'Minimum 8 characters.'}>
              <TextInput
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={v => set('password', v)}
                placeholder={editing ? 'Leave blank to keep current password' : 'At least 8 characters'}
                rightSlot={
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{
                    width: 28, height: 28, borderRadius: 6, border: 'none',
                    backgroundColor: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {showPw ? <EyeOff size={14} color="#9CA3AF" /> : <EyeIcon size={14} color="#9CA3AF" />}
                  </button>
                }
              />
            </Field>
          </Section>

          <Section title="Profile">
            <Field label="First Name">
              <TextInput value={form.first_name} onChange={v => set('first_name', v)} placeholder="Juan" />
            </Field>
            <Field label="Last Name">
              <TextInput value={form.last_name} onChange={v => set('last_name', v)} placeholder="Dela Cruz" />
            </Field>
            <Field full label="Phone">
              <TextInput value={form.phone} onChange={v => set('phone', v)} placeholder="+63 917 123 4567" />
            </Field>
          </Section>

          <Section title="Address">
            <Field label="Barangay">
              <TextInput value={form.barangay} onChange={v => set('barangay', v)} placeholder="e.g. Sta. Rosa" />
            </Field>
            <Field label="Municipality">
              <TextInput value={form.municipality} onChange={v => set('municipality', v)} placeholder="Panabo City" />
            </Field>
            <Field full label="Province">
              <TextInput value={form.province} onChange={v => set('province', v)} placeholder="Davao del Norte" />
            </Field>
          </Section>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Role & Access
            </p>
            <RoleSelector value={form.role} onChange={v => set('role', v)} />
            <div style={{ marginTop: 16 }}>
              <Field label="Account Status" full>
                <Toggle value={form.is_active} onChange={v => set('is_active', v)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 26px', borderTop: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 12, backgroundColor: C.surfaceAlt }}>
          {error
            ? <p style={{ fontSize: 12, color: C.error, fontWeight: 600, flex: 1, lineHeight: 1.45, maxWidth: 380 }}>{error}</p>
            : <div style={{ flex: 1 }} />}
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
            {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Delete confirmation                                                       */
/* -------------------------------------------------------------------------- */

function DeleteConfirm({ user, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  if (!user) return null;
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
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Deactivate user?</p>
            <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4, lineHeight: 1.55 }}>
              <strong>{user.name || user.username}</strong> will no longer be able to log in.
              Their farms, scans, and history are kept intact. You can reactivate them later from the same row.
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
/*  Details modal — full credentials                                          */
/* -------------------------------------------------------------------------- */

function DetailRow({ Icon, label, value, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} color={C.textSecondary} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
        <p style={{
          fontSize: 13, color: C.text, fontWeight: 500,
          marginTop: 3,
          wordBreak: 'break-word',
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : 'inherit',
        }}>
          {value || <span style={{ color: '#9CA3AF', fontWeight: 400 }}>—</span>}
        </p>
      </div>
    </div>
  );
}

function UserDetailsModal({ user, resolvedAddress, onClose }) {
  if (!user) return null;

  const roleLabel = user.isSuperuser ? 'Superadmin' : (user.isStaff ? 'Admin' : 'Farmer');
  const roleStyle = user.isSuperuser
    ? { bg: '#FEE4E2', color: '#B42318' }
    : (user.isStaff ? { bg: C.accentLight, color: C.accent } : { bg: C.primaryLighter, color: C.primary });

  const location = [user.barangay, user.municipality, user.province].filter(Boolean).join(', ');
  const initials = (user.name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';

  // Prefer the Nominatim-resolved address from the user's pin coords.
  const gpsBarangay = resolvedAddress?.barangay || user.gpsBarangay || '';
  const gpsCity     = resolvedAddress?.city     || user.municipality || '';
  const gpsProvince = resolvedAddress?.province  || user.province || '';
  const gpsLine     = [gpsBarangay, gpsCity, gpsProvince].filter(Boolean).join(', ');

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
        width: '100%', maxWidth: 560, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 26px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: C.primaryLighter, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{user.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                {roleLabel}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: user.is_active ? C.success : '#9CA3AF', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: user.is_active ? C.success : '#D1D5DB' }} />
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 26px 22px' }}>
          {/* Section: Identity */}
          <p style={{ fontSize: 10, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 16, marginBottom: 4 }}>
            Identity
          </p>
          <DetailRow Icon={Hash}   label="User ID"     value={user.id}        mono />
          <DetailRow Icon={AtSign} label="Username"    value={user.username}  mono />
          <DetailRow Icon={UsersIcon} label="First Name"  value={user.first_name} />
          <DetailRow Icon={UsersIcon} label="Last Name"   value={user.last_name} />

          {/* Section: Contact */}
          <p style={{ fontSize: 10, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 22, marginBottom: 4 }}>
            Contact
          </p>
          <DetailRow Icon={Mail}    label="Email"   value={user.email}  mono />
          <DetailRow Icon={Phone}   label="Phone"   value={user.phone}  mono />

          {/* Section: Location — pin takes precedence; registered shown only as fallback */}
          <p style={{ fontSize: 10, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 22, marginBottom: 4 }}>
            Location
          </p>
          {user.hasGps ? (
            <>
              <DetailRow
                Icon={MapPin}
                label={`Pin Location · ${user.gpsFarmName || 'active farm'}`}
                value={gpsLine || 'Resolving location…'}
              />
              <DetailRow
                Icon={Hash}
                label="GPS Coordinates"
                value={`${Number(user.gpsLatitude).toFixed(6)}, ${Number(user.gpsLongitude).toFixed(6)}`}
                mono
              />
            </>
          ) : (
            <>
              <DetailRow Icon={MapPin} label="Registered Address" value={location || '—'} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', marginTop: 8,
                borderRadius: 8, backgroundColor: C.surfaceAlt,
              }}>
                <AlertCircle size={12} color="#9CA3AF" />
                <p style={{ fontSize: 11, color: C.textSecondary }}>
                  No GPS pin yet — farmer has not pinned a farm on the map.
                </p>
              </div>
            </>
          )}

          {/* Section: Access */}
          <p style={{ fontSize: 10, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 22, marginBottom: 4 }}>
            Access
          </p>
          <DetailRow Icon={Shield}   label="Role"     value={roleLabel} />
          <DetailRow Icon={UsersIcon}  label="Farms"    value={user.farmCount} />

          {/* Section: Activity */}
          <p style={{ fontSize: 10, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 22, marginBottom: 4 }}>
            Activity
          </p>
          <DetailRow Icon={Calendar} label="Date Joined" value={formatDateTime(user.date_joined)} />
          <DetailRow Icon={Clock}    label="Last Login"  value={formatDateTime(user.last_login)} />
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 26px', borderTop: `1px solid ${C.borderLight}`, backgroundColor: C.surfaceAlt, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600,
            color: C.textSecondary, backgroundColor: C.surface,
            border: `1px solid ${C.borderLight}`, borderRadius: 10,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export default function Users() {
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatus] = useState('');
  const [roleFilter, setRole] = useState('');
  const [users, setUsers]     = useState([]);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [error, setError]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [resolved, setResolved] = useState({});  // { userId: { barangay, city, province } }

  useEffect(() => {
    api.users()
      .then(data => setUsers(data.map(normalizeFromServer)))
      .catch(err => setError(err?.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geocoding strategy (same as FarmMap):
  //   1. Synchronous pass — populate everything already in localStorage,
  //      including coords that FarmMap already resolved this session.
  //   2. Async pass — fetch remaining coords from Nominatim, throttled
  //      only when a real network call happens (cache hits are free).
  useEffect(() => {
    if (!users.length) return;

    const fromCache = {};
    for (const u of users) {
      if (!u.hasGps) continue;
      const hit = getCachedGeocode(u.gpsLatitude, u.gpsLongitude);
      if (hit) fromCache[u.id] = hit;
    }
    if (Object.keys(fromCache).length) {
      setResolved(prev => ({ ...fromCache, ...prev }));
    }

    let alive = true;
    (async () => {
      for (const u of users) {
        if (!alive) return;
        if (!u.hasGps) continue;
        if (fromCache[u.id]) continue;
        const { result, fromNetwork } = await reverseGeocode(u.gpsLatitude, u.gpsLongitude);
        if (!alive) return;
        if (result) setResolved(prev => ({ ...prev, [u.id]: result }));
        if (fromNetwork) await new Promise(r => setTimeout(r, 1100));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      u.name.toLowerCase().includes(q)     ||
      u.email.toLowerCase().includes(q)    ||
      u.username.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q);
    const matchS = !statusFilter || u.status === statusFilter;
    const matchR = !roleFilter   || u.role   === roleFilter;
    return matchQ && matchS && matchR;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active     = users.filter(u => u.status === 'Active').length;
  const inactive   = users.filter(u => u.status === 'Inactive').length;

  const normalizeFromServer = (u) => ({
    id:           u.id,
    name:         dedupeName(u.name),
    firstName:    u.first_name || '',
    lastName:     u.last_name  || '',
    email:        u.email || '',
    username:     u.username || '',
    phone:        u.phone || '',
    barangay:     u.barangay || '',
    municipality: u.municipality || '',
    province:     u.province || '',
    role:         u.is_superuser ? 'Superadmin' : (u.is_staff ? 'Admin' : 'Farmer'),
    isStaff:      u.is_staff,
    isSuperuser:  u.is_superuser,
    farmCount:    u.farm_count ?? 0,
    dateJoined:   u.date_joined,
    lastLogin:    u.last_login,
    status:       u.is_active ? 'Active' : 'Inactive',

    // GPS — from the user's active farm pin (real coords from the
    // capture API). Empty when the user has not pinned a farm yet.
    hasGps:        !!u.has_gps,
    gpsLatitude:   u.gps_latitude,
    gpsLongitude:  u.gps_longitude,
    gpsBarangay:   u.gps_barangay || '',
    gpsFarmName:   u.gps_farm_name || '',
  });

  const handleSaved = (saved, wasEditing) => {
    const norm = normalizeFromServer(saved);
    setUsers(prev => wasEditing
      ? prev.map(u => u.id === norm.id ? norm : u)
      : [norm, ...prev]
    );
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.deleteUser(toDelete.id);
      setUsers(prev => prev.map(u => u.id === toDelete.id ? { ...u, status: 'Inactive' } : u));
    } catch (err) {
      setError(err?.message || 'Delete failed.');
    } finally {
      setToDelete(null);
    }
  };

  const toggleStatus = async (id) => {
    const user = users.find(u => u.id === id);
    const newActive = user.status !== 'Active';
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newActive ? 'Active' : 'Inactive' } : u));
    try {
      await api.toggleUser(id, newActive);
    } catch (err) {
      // revert on failure
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: !newActive ? 'Active' : 'Inactive' } : u));
      setError(err?.message || 'Failed to update user.');
    }
  };

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Users</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            Manage registered farmer and admin accounts — create, edit, and toggle access.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            backgroundColor: C.primary, color: '#fff',
            border: 'none', borderRadius: 10, padding: '9px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          <Plus size={14} />
          Add User
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Total Users"    value={users.length} unit="users"    badge="all registered"  green={true}  Icon={UsersIcon}  />
        <StatCard label="Active Users"   value={active}       unit="active"   badge={`${active} can log in`} green={true}  Icon={UserCheck2} />
        <StatCard label="Inactive Users" value={inactive}     unit="inactive" badge={inactive > 0 ? `${inactive} disabled` : 'none disabled'} green={false} Icon={UserMinus}  />
      </div>

      {/* Filter bar */}
      <div style={{ backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, username, or phone…"
            style={{ paddingLeft: 32, paddingRight: 12, height: 36, width: '100%', fontSize: 13, border: `1px solid ${C.borderLight}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: C.text, backgroundColor: C.surface }}
          />
        </div>
        <Dropdown
          value={roleFilter}
          onChange={v => { setRole(v); setPage(1); }}
          placeholder="All Roles"
          options={[
            { value: 'Farmer',     label: 'Farmer'     },
            { value: 'Admin',      label: 'Admin'      },
            { value: 'Superadmin', label: 'Superadmin' },
          ]}
        />
        <Dropdown
          value={statusFilter}
          onChange={v => { setStatus(v); setPage(1); }}
          placeholder="All Statuses"
          options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          ...card, padding: '14px 20px',
          borderLeft: `3px solid ${C.error}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertCircle size={16} color={C.error} />
          <p style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1 }}>{error}</p>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div style={card}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Registered Accounts</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {loading
                ? 'Loading…'
                : `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} users`}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: C.primaryLighter, color: C.primary }}>
            live · database
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>User</th>
              <th style={th}>Contact</th>
              <th style={th}>Location</th>
              <th style={th}>Role</th>
              <th style={{ ...th, textAlign: 'right' }}>Farms</th>
              <th style={th}>Joined</th>
              <th style={{ ...th, textAlign: 'center' }}>Status</th>
              <th style={{ ...th, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((u, i) => {
              const isActive = u.status === 'Active';
              const col      = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const init     = (u.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
              const roleStyle = u.isSuperuser
                ? { bg: '#FEE4E2', color: '#B42318' }
                : (u.isStaff ? { bg: C.accentLight, color: C.accent } : { bg: C.primaryLighter, color: C.primary });
              const locShort = [u.barangay, u.municipality].filter(Boolean).join(', ');

              return (
                <tr key={u.id} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  {/* User: avatar + name + username */}
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: col + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{init}</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: C.text }}>{u.name || u.username}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          @{u.username}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Contact: email + phone */}
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.text }}>
                      <Mail size={11} color="#9CA3AF" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                    </div>
                    {u.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                        <Phone size={10} color="#9CA3AF" />
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{u.phone}</span>
                      </div>
                    )}
                  </td>

                  {/* Location — pin-resolved address from Nominatim only */}
                  <td style={{ padding: '13px 20px' }}>
                    {u.hasGps
                      ? (() => {
                          const r = resolved[u.id];
                          const locLine = r
                            ? [r.barangay, r.city].filter(Boolean).join(', ')
                            : null;
                          return (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MapPin size={11} color={r ? C.primary : '#D1D5DB'} />
                                {locLine
                                  ? <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{locLine}</span>
                                  : <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>resolving location…</span>}
                              </div>
                              <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                  fontSize: 9, fontWeight: 700,
                                  padding: '1px 6px', borderRadius: 5,
                                  backgroundColor: C.primaryLighter, color: C.primary,
                                  letterSpacing: '0.06em',
                                }}>
                                  GPS PIN
                                </span>
                                <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                  {Number(u.gpsLatitude).toFixed(4)}, {Number(u.gpsLongitude).toFixed(4)}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      : locShort
                        ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={11} color="#9CA3AF" />
                              <span style={{ fontSize: 12, color: C.text }}>{locShort}</span>
                            </div>
                            <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>registered address</p>
                          </div>
                        )
                        : <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span>
                    }
                  </td>

                  {/* Role */}
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 20,
                      backgroundColor: roleStyle.bg, color: roleStyle.color,
                    }}>
                      {u.role}
                    </span>
                  </td>

                  {/* Farms */}
                  <td style={{ padding: '13px 20px', textAlign: 'right', color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {u.farmCount}
                  </td>

                  {/* Joined */}
                  <td style={{ padding: '13px 20px', color: '#9CA3AF', fontSize: 12 }}>
                    {formatDate(u.dateJoined)}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: isActive ? C.success : '#D1D5DB' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? C.success : '#9CA3AF' }}>{u.status}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <button onClick={() => setDetails(u)} title="View details"
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={13} color="#6B7280" />
                      </button>
                      <button onClick={() => { setEditing(u); setModalOpen(true); }} title="Edit"
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={13} color="#6B7280" />
                      </button>
                      <button onClick={() => toggleStatus(u.id)} title={isActive ? 'Deactivate' : 'Activate'}
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isActive ? <UserX size={14} color={C.error} /> : <UserCheck size={14} color={C.success} />}
                      </button>
                      <button onClick={() => setToDelete(u)} title="Delete (soft)" disabled={!isActive}
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: isActive ? 'pointer' : 'not-allowed', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActive ? 1 : 0.35 }}>
                        <Trash2 size={13} color={C.error} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {loading && Array.from({ length: 5 }).map((_, i) => <SkelTableRow key={`sk-${i}`} cells={8} />)}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '52px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No users found.</td></tr>
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

      <UserDetailsModal
        user={details}
        resolvedAddress={details ? resolved[details.id] : null}
        onClose={() => setDetails(null)}
      />
      <UserFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
      <DeleteConfirm
        user={toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
