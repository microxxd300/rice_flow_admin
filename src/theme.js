/* RiceFlow's look, the same as the mobile app: a gray page behind big rounded white
   cards, near-black text and buttons, emerald green for growth and "done". */
export const C = {
  primary:        '#059669',   // emerald, the app's green
  primaryLight:   '#10B981',
  primaryLighter: '#E8F5EF',
  primaryDark:    '#047857',
  /* The nav: a white panel; the current page sits in a dark pill */
  sidebar:        '#FFFFFF',
  sidebarHover:   '#F1F2F1',
  sidebarActive:  '#111827',
  ink:            '#111827',   // text, dark buttons, the picked chip

  accent:         '#F5A623',
  accentLight:    '#FEF3DC',
  surface:        '#FFFFFF',
  surfaceAlt:     '#F1F2F1',
  background:     '#F1F2F1',   // the page gray behind the cards
  text:           '#111827',
  textSecondary:  '#6B7280',
  textTertiary:   '#9CA3AF',
  border:         '#E5E7EB',
  borderLight:    '#ECEEEC',
  success:        '#059669',
  successLight:   '#E8F5EF',
  warning:        '#B45309',
  warningLight:   '#FEF3DC',
  error:          '#DC2626',
  errorLight:     '#FDECEC',
  info:           '#2563EB',
  infoLight:      '#EAF1FD',
};

/* Soft tints for icon tiles, the app's palette (green, amber, blue, red, ink) */
export const pastel = [
  { bg: '#E8F5EF', icon: '#059669' },
  { bg: '#FEF3DC', icon: '#B45309' },
  { bg: '#EAF1FD', icon: '#2563EB' },
  { bg: '#FDECEC', icon: '#DC2626' },
  { bg: '#F1F2F1', icon: '#111827' },
];

/* ── Diagonal hatching ───────────────────────────────────────────────────
   The signature device of this design: anything INACTIVE or REMAINING is
   filled with pale green diagonal stripes rather than flat gray. Solid green
   means done / active; hatched means pending / empty.

   hatchCss()  -> a CSS background for plain divs (bars, tracks, fills)
   HATCH_ID    -> id of the reusable <pattern> for SVG charts (Recharts);
                  render <HatchPattern/> once inside the <svg> then reference
                  it as fill={`url(#${HATCH_ID})`}                            */
export const hatchCss = (stripe = '#BFE3D1', bg = '#F1F7F4', size = 8) =>
  `repeating-linear-gradient(45deg, ${stripe} 0 1.5px, ${bg} 1.5px ${size}px)`;

export const HATCH_ID = 'rf-hatch';

/* Categorical chart ramp — five steps of the brand green, dark to light, so a
   pie/donut with any number of slices still reads as one family. This is our
   equivalent of a shadcn --chart-1..5 scale. */
export const CHART_GREEN = [
  '#064E3B',
  '#047857',  // primaryDark
  '#059669',  // primary
  '#34D399',
  '#A7E3C9',
];

export const cardShadow = '0 4px 14px rgba(0,0,0,0.05)';
export const glowShadow = (color) => `0 4px 20px ${color}33, 0 1px 4px rgba(26,26,46,0.06)`;

/* ── Extended tokens (polish pass) ──────────────────────────────────────── */

// Elevation scale — sm for rows/inputs, md for cards, lg for popovers/modals
export const shadow = {
  sm: '0 1px 2px rgba(26,26,46,0.05)',
  md: cardShadow,
  lg: '0 12px 32px rgba(26,26,46,0.12), 0 2px 8px rgba(26,26,46,0.06)',
};

export const radius = { sm: 12, md: 16, lg: 24, xl: 28, full: 9999 };

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
