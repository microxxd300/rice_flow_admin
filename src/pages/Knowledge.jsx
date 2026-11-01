import { useState, useEffect } from 'react';
import { C } from '../theme';
import { api } from '../services/api';
import Skeleton, { SkeletonStyles } from '../components/Skeleton';
import { BookOpen, Save, RotateCcw, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const shadow   = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const baseCard = { backgroundColor: C.surface, borderRadius: 14, border: `1px solid ${C.borderLight}`, boxShadow: shadow };

/*
  The rice-farming reference the AI chat answers from (GET/PUT /api/ai/knowledge/).
  Agriculturists write it from PhilRice and DA sources; it goes into every chat, so
  the backend caps its length (max_chars).
*/
export default function Knowledge() {
  const [content, setContent]     = useState('');
  const [saved, setSaved]         = useState('');   // what the server has
  const [maxChars, setMaxChars]   = useState(20000);
  const [savedAt, setSavedAt]     = useState(null);
  const [savedBy, setSavedBy]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState(null);  // { ok, text }

  const apply = data => {
    setContent(data?.content ?? '');
    setSaved(data?.content ?? '');
    if (data?.max_chars) setMaxChars(data.max_chars);
    setSavedAt(data?.updated_at ? new Date(data.updated_at) : null);
    setSavedBy(data?.updated_by_name || '');
  };

  useEffect(() => {
    let alive = true;
    api.knowledge()
      .then(data => alive && apply(data))
      .catch(err => alive && setMessage({ ok: false, text: err?.message || 'Could not load the knowledge sheet.' }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const dirty    = content !== saved;
  const tooLong  = content.length > maxChars;
  const canSave  = dirty && !tooLong && !saving;

  // Unsaved edits are lost on reload or closing the tab: ask first
  useEffect(() => {
    if (!dirty) return;
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      apply(await api.saveKnowledge(content));
      setMessage({ ok: true, text: 'Saved · the AI chat uses it from the next question.' });
    } catch (err) {
      setMessage({ ok: false, text: err?.message || 'Save failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setContent(saved);
    setMessage(null);
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
        <SkeletonStyles />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={200} height={22} radius={6} />
          <Skeleton width={460} height={13} radius={4} />
        </div>
        <Skeleton width="100%" height={70} radius={14} />
        <Skeleton width="100%" height={460} radius={14} />
      </div>
    );
  }

  const pct = Math.min(100, Math.round((content.length / maxChars) * 100));

  return (
    <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>
      <SkeletonStyles />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>AI Knowledge</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            The rice-farming reference the AI assistant answers from, written from PhilRice and DA sources.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleDiscard} disabled={!dirty || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: C.surface, color: dirty ? C.textSecondary : C.textTertiary,
              border: `1px solid ${C.borderLight}`, borderRadius: 10,
              padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: dirty && !saving ? 'pointer' : 'default', fontFamily: 'inherit',
            }}>
            <RotateCcw size={14} />
            Discard changes
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: canSave ? C.primary : C.surfaceAlt,
              color: canSave ? '#FFFFFF' : C.textTertiary,
              border: 'none', borderRadius: 10,
              padding: '9px 16px', fontSize: 13, fontWeight: 600,
              cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit',
            }}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── How it is used ────────────────────────────────────────────── */}
      <div style={{ ...baseCard, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={18} color={C.info} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
          It goes into <b>every</b> AI chat, and the assistant prefers it over general knowledge and names the
          source it used. End each part with its source and page, for example
          <code style={{ backgroundColor: C.surfaceAlt, padding: '1px 6px', borderRadius: 5, margin: '0 4px' }}>
            (Source: PalayCheck 2022, p. 45)
          </code>
          so farmers and reviewers can check it. Leave it empty and the assistant uses general rice-farming knowledge.
        </div>
      </div>

      {message && (
        <div style={{
          ...baseCard, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center',
          backgroundColor: message.ok ? C.successLight : C.errorLight,
          color: message.ok ? C.success : C.error, fontSize: 13, fontWeight: 600,
        }}>
          {message.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* ── Editor ────────────────────────────────────────────────────── */}
      <div style={{ ...baseCard, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: C.text }}>
            <BookOpen size={16} color={C.primary} />
            Knowledge sheet
            {dirty && <span style={{ fontSize: 11, fontWeight: 600, color: C.warning }}>· unsaved changes</span>}
          </div>
          <div style={{ fontSize: 12, color: C.textTertiary }}>
            {savedAt
              ? `Last saved ${savedAt.toLocaleString()}${savedBy ? ` by ${savedBy}` : ''}`
              : 'Not saved yet'}
          </div>
        </div>

        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); setMessage(null); }}
          spellCheck
          aria-label="Knowledge sheet"
          placeholder={'FERTILIZER: …what to apply, when and how much. (Source: PalayCheck 2022, p. 36)\n\nWATER: …'}
          style={{
            width: '100%', minHeight: 460, resize: 'vertical',
            border: `1px solid ${tooLong ? C.error : C.border}`, borderRadius: 10,
            padding: 14, fontSize: 13, lineHeight: 1.6, color: C.text,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            outline: 'none', backgroundColor: C.surface,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.surfaceAlt, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: tooLong ? C.error : pct > 90 ? C.warning : C.primary }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: tooLong ? C.error : C.textSecondary, whiteSpace: 'nowrap' }}>
            {content.length.toLocaleString()} / {maxChars.toLocaleString()} characters
          </span>
        </div>
        {tooLong && (
          <div style={{ fontSize: 12, color: C.error }}>
            Too long to save: it goes into every chat request. Shorten it by {(content.length - maxChars).toLocaleString()} characters.
          </div>
        )}
      </div>
    </div>
  );
}
