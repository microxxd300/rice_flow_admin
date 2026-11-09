import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { C } from '../theme';
import { timeAgo } from '../timeAgo';

/* Rows of the change log (GET /api/activity/changes/). Each row says who changed
   what; rows with recorded values expand into a before → after table. */

const ROLE_TAG = {
  admin:     { label: 'Admin',     color: C.primary, bg: C.primaryLighter },
  validator: { label: 'Validator', color: '#B7791F', bg: C.accentLight },
};

/** Show a recorded value: ranges as "min–max", empty as "—". */
function formatValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') {
    if ('min' in v && 'max' in v) return `${v.min}–${v.max}`;
    return JSON.stringify(v);
  }
  return String(v);
}

function RoleTag({ role }) {
  const tag = ROLE_TAG[role] || { label: role, color: C.textSecondary, bg: C.surfaceAlt };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      color: tag.color, backgroundColor: tag.bg, flexShrink: 0,
    }}>
      {tag.label}
    </span>
  );
}

function ChangeRow({ row, last, expandable }) {
  const [open, setOpen] = useState(false);
  const fields = Object.entries(row.changes || {});
  const canOpen = expandable && fields.length > 0;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${C.borderLight}` }}>
      <div
        onClick={canOpen ? () => setOpen(o => !o) : undefined}
        style={{
          padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12,
          cursor: canOpen ? 'pointer' : 'default',
        }}>
        <RoleTag role={row.actor_role} />
        <p style={{ fontSize: 13, color: C.text, flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>{row.actor_name}</span>
          <span style={{ color: C.textSecondary }}> {row.summary}</span>
        </p>
        <span title={new Date(row.created_at).toLocaleString()}
          style={{ fontSize: 11, color: C.textTertiary, flexShrink: 0 }}>
          {timeAgo(row.created_at)}
        </span>
        {canOpen && <Chevron size={14} color={C.textTertiary} style={{ flexShrink: 0 }} />}
      </div>
      {open && (
        <table style={{ width: 'calc(100% - 40px)', margin: '0 20px 14px', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.textTertiary, textAlign: 'left' }}>
              <th style={{ padding: '6px 10px', fontWeight: 600 }}>Field</th>
              <th style={{ padding: '6px 10px', fontWeight: 600 }}>Before</th>
              <th style={{ padding: '6px 10px', fontWeight: 600 }}>After</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(([field, [before, after]]) => (
              <tr key={field} style={{ backgroundColor: C.surfaceAlt }}>
                <td style={{ padding: '6px 10px', color: C.text, fontWeight: 600 }}>{field.replaceAll('_', ' ')}</td>
                <td style={{ padding: '6px 10px', color: C.textSecondary }}>{formatValue(before)}</td>
                <td style={{ padding: '6px 10px', color: C.text }}>{formatValue(after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ChangeList({ rows, expandable = true, empty = 'No changes recorded yet.' }) {
  if (!rows.length) {
    return (
<div style={{ padding: '32px 24px', textAlign: 'center' }}><p style={{ fontSize: 13.5, fontWeight: 600, color: C.textSecondary, marginTop: 6 }}>{empty}</p></div>
    );
  }
  return rows.map((r, i) => (
    <ChangeRow key={r.id} row={r} last={i === rows.length - 1} expandable={expandable} />
  ));
}
