import { C } from '../theme';

/**
 * Skeleton placeholder with a gentle shimmer.
 *
 * Usage:
 *   <Skeleton width={120} height={14} />
 *   <Skeleton width="60%" height={20} radius={6} />
 *   <Skeleton circle size={32} />
 *
 * All variants share a single CSS keyframe injected by SkeletonStyles
 * (which lives in this file too — render it ONCE per page).
 */

export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes riceflow-shimmer {
        0%   { background-position: -120% 0; }
        100% { background-position: 120% 0; }
      }
      .riceflow-skel {
        background: linear-gradient(
          90deg,
          ${C.surfaceAlt} 0%,
          #EDEFF1 50%,
          ${C.surfaceAlt} 100%
        );
        background-size: 200% 100%;
        animation: riceflow-shimmer 1.4s ease-in-out infinite;
      }
    `}</style>
  );
}

export default function Skeleton({
  width  = '100%',
  height = 12,
  radius = 6,
  circle = false,
  size,
  style  = {},
}) {
  const w = circle ? size : width;
  const h = circle ? size : height;
  const r = circle ? '50%' : radius;
  return (
    <div
      className="riceflow-skel"
      style={{
        width: w, height: h,
        borderRadius: r,
        display: 'inline-block',
        ...style,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Common patterns                                                           */
/* -------------------------------------------------------------------------- */

export function SkelText({ width = '70%', height = 12, style }) {
  return <Skeleton width={width} height={height} radius={4} style={style} />;
}

export function SkelStatCard() {
  const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
  return (
    <div style={{
      backgroundColor: C.surface, borderRadius: 14,
      border: `1px solid ${C.borderLight}`, boxShadow: shadow,
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <Skeleton width={110} height={11} radius={3} />
        <Skeleton circle size={30} />
      </div>
      <Skeleton width={70} height={28} radius={6} style={{ marginBottom: 10 }} />
      <Skeleton width={130} height={11} radius={3} />
    </div>
  );
}

export function SkelTableRow({ cells = 6 }) {
  return (
    <tr>
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
          {i === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skeleton circle size={32} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skeleton width={120} height={11} radius={3} />
                <Skeleton width={90}  height={9}  radius={3} />
              </div>
            </div>
          ) : (
            <Skeleton width={i === cells - 1 ? 56 : 90} height={11} radius={3} />
          )}
        </td>
      ))}
    </tr>
  );
}

export function SkelListRow() {
  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: `1px solid ${C.borderLight}`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <Skeleton circle size={36} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="40%" height={12} radius={4} />
        <Skeleton width="65%" height={10} radius={4} />
      </div>
      <Skeleton width={60} height={11} radius={4} />
    </div>
  );
}
