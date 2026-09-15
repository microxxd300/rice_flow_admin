export const C = {
  /* Deep forest green ramp — the brand token from CLAUDE.md (#1F6B3F) */
  primary:        '#1F6B3F',
  primaryLight:   '#3D9D5E',
  primaryLighter: '#E8F5E9',
  primaryDark:    '#17542F',
  /* The nav is a white panel now. `sidebar` is its surface; `sidebarActive`
     is the soft green chip behind the current route. */
  sidebar:        '#FFFFFF',
  sidebarHover:   '#F3F7F4',
  sidebarActive:  '#EAF3EC',
  /* Near-black, for the dark feature cards (promo, timer) */
  ink:            '#111511',

  accent:         '#F5A623',
  accentLight:    '#FEF3DC',
  surface:        '#FFFFFF',
  surfaceAlt:     '#F4F6F4',
  background:     '#F5F6F4',
  text:           '#111511',
  textSecondary:  '#6B7280',
  textTertiary:   '#9CA3AF',
  border:         '#E5E7EB',
  borderLight:    '#EDF0EE',
  success:        '#1F6B3F',
  successLight:   '#E8F5E9',
  warning:        '#E67E22',
  warningLight:   '#FDEBD0',
  error:          '#E74C3C',
  errorLight:     '#FADBD8',
  info:           '#2980B9',
  infoLight:      '#D6EAF8',
};

/* Soft tints for stat cards — one per card, cycled in order */
export const pastel = [
  { bg: '#EFEAFB', icon: '#7C5CD6' },  // lavender
  { bg: '#E8EEFB', icon: '#4A72C4' },  // blue
  { bg: '#FBE9F3', icon: '#C4568F' },  // pink
  { bg: '#FCEBE9', icon: '#C45A4A' },  // salmon
];

/* ── Diagonal hatching ───────────────────────────────────────────────────
   The signature device of this design: anything INACTIVE or REMAINING is
   filled with pale green diagonal stripes rather than flat gray. Solid green
   means done / active; hatched means pending / empty.

   hatchCss()  -> a CSS background for plain divs (bars, tracks, fills)
   HATCH_ID    -> id of the reusable <pattern> for SVG charts (Recharts);
                  render <HatchPattern/> once inside the <svg> then reference
                  it as fill={`url(#${HATCH_ID})`}                            */
export const hatchCss = (stripe = '#C7DFCE', bg = '#F2F8F4', size = 8) =>
  `repeating-linear-gradient(45deg, ${stripe} 0 1.5px, ${bg} 1.5px ${size}px)`;

export const HATCH_ID = 'rf-hatch';

/* Categorical chart ramp — five steps of the brand green, dark to light, so a
   pie/donut with any number of slices still reads as one family. This is our
   equivalent of a shadcn --chart-1..5 scale. */
export const CHART_GREEN = [
  '#17542F',  // primaryDark
  '#1F6B3F',  // primary
  '#2E8552',
  '#3D9D5E',  // primaryLight
  '#7BC395',
];

export const cardShadow = '0 2px 12px rgba(17,21,17,0.05), 0 1px 3px rgba(17,21,17,0.04)';
export const glowShadow = (color) => `0 4px 20px ${color}33, 0 1px 4px rgba(26,26,46,0.06)`;

/* ── Extended tokens (polish pass) ──────────────────────────────────────── */

// Elevation scale — sm for rows/inputs, md for cards, lg for popovers/modals
export const shadow = {
  sm: '0 1px 2px rgba(26,26,46,0.05)',
  md: cardShadow,
  lg: '0 12px 32px rgba(26,26,46,0.12), 0 2px 8px rgba(26,26,46,0.06)',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, full: 9999 };

// One card style shared by pages (pages previously each declared their own)
export const cardStyle = {
  backgroundColor: C.surface,
  borderRadius: radius.lg,
  border: `1px solid ${C.borderLight}`,
  boxShadow: shadow.md,
  overflow: 'hidden',
};

// Consistent page frame: every page header uses the same title/sub pattern
export const pageFrame = {
  padding: '28px 36px',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  backgroundColor: C.background,
  minHeight: '100%',
};
