import { C, cardShadow } from '../theme';

/**
 * A page's photo, beside a short caption. The photo keeps its own 3:1 shape and is shown
 * at most 480 px wide (the files are 1536 × 512), so it is never cropped hard or enlarged
 * (that is what made a full-width strip look zoomed and blurry).
 */
export default function PhotoStrip({ src, title, text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 22, padding: 10, paddingRight: 24,
      backgroundColor: C.surface, borderRadius: 24, boxShadow: cardShadow, flexShrink: 0,
    }}>
      <img
        src={src} alt=""
        style={{ width: 'min(480px, 42%)', aspectRatio: '3 / 1', objectFit: 'cover', borderRadius: 18, display: 'block', flexShrink: 0 }}
      />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</p>
        {text && <p style={{ fontSize: 13, color: C.textSecondary, marginTop: 4, lineHeight: '19px' }}>{text}</p>}
      </div>
    </div>
  );
}
