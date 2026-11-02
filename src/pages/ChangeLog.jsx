import { useState, useEffect } from 'react';
import { History, Search, RefreshCw } from 'lucide-react';
import { C } from '../theme';
import { api } from '../services/api';
import Skeleton, { SkeletonStyles } from '../components/Skeleton';
import ChangeList from '../components/ChangeList';

const shadow   = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const baseCard = { backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.borderLight}`, boxShadow: shadow, overflow: 'hidden' };

const FILTERS = [
  { value: '',          label: 'Everyone'  },
  { value: 'validator', label: 'Validator' },
  { value: 'admin',     label: 'Admin'     },
];

/*
  Who changed what from the admin website, newest first (admin only). This is
  how the admin reviews the validator's corrections: every edit keeps its old
  and new values.
*/
export default function ChangeLog() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [role, setRole]       = useState('');
  const [search, setSearch]   = useState('');
  const [reload, setReload]   = useState(0);

  useEffect(() => {
    let alive = true;
    api.changes({ limit: 500 })
      .then(data => alive && setRows(Array.isArray(data) ? data : []))
      .catch(err => alive && setError(err?.message || 'Could not load the change log.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [reload]);

  const refresh = () => {
    api.invalidate();
    setLoading(true);
    setError('');
    setReload(n => n + 1);
  };

  const q = search.trim().toLowerCase();
  const shown = rows.filter(r =>
    (!role || r.actor_role === role) &&
    (!q || `${r.actor_name} ${r.summary} ${r.target}`.toLowerCase().includes(q))
  );

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Change Log</h1>
          <p style={{ fontSize: 13, color: C.textTertiary, marginTop: 4 }}>
            Every change made from this website: who made it, when, and the old and new values.
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            backgroundColor: C.surface, color: C.textSecondary,
            border: `1px solid ${C.borderLight}`, borderRadius: 10,
            padding: '9px 14px', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, backgroundColor: C.surfaceAlt, borderRadius: 10 }}>
          {FILTERS.map(f => {
            const on = role === f.value;
            return (
              <button key={f.value} onClick={() => setRole(f.value)}
                style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7,
                  color: on ? C.text : C.textTertiary, backgroundColor: on ? C.surface : 'transparent',
                  boxShadow: on ? '0 1px 3px rgba(26,26,46,0.08)' : 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {f.label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8, ...baseCard, padding: '0 12px', height: 38 }}>
          <Search size={14} color={C.textTertiary} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, variety, farm…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', backgroundColor: 'transparent', color: C.text }} />
        </div>
      </div>

      <div style={baseCard}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} color={C.primary} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Changes</span>
          {!loading && <span style={{ fontSize: 12, color: C.textTertiary }}>· {shown.length}</span>}
        </div>
        {loading && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} width="100%" height={18} radius={5} />)}
          </div>
        )}
        {!loading && error && (
          <div style={{ padding: '36px 24px', textAlign: 'center', color: C.error, fontSize: 13 }}>{error}</div>
        )}
        {!loading && !error && (
          <ChangeList rows={shown} empty={rows.length ? 'No changes match the filter.' : 'No changes recorded yet.'} />
        )}
      </div>
    </div>
  );
}
