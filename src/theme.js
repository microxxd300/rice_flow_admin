export const C = {
  /* Green ramp sampled from the rice-field photo (leaf.jpg) */
  primary:        '#4C8C57',
  primaryLight:   '#6BA678',
  primaryLighter: '#E9F2EB',
  primaryDark:    '#2E5C39',
  /* Deep forest green — sidebar rail */
  sidebar:        '#1E4D30',
  sidebarHover:   '#2A5F3C',

  accent:         '#F5A623',
  accentLight:    '#FEF3DC',
  surface:        '#FFFFFF',
  surfaceAlt:     '#F4F6F4',
  background:     '#F2F4F2',
  text:           '#1A1A2E',
  textSecondary:  '#6B7280',
  textTertiary:   '#9CA3AF',
  border:         '#E5E7EB',
  borderLight:    '#F0F2F1',
  success:        '#4C8C57',
  successLight:   '#E9F2EB',
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

export const cardShadow = '0 2px 12px rgba(26,26,46,0.06), 0 1px 3px rgba(26,26,46,0.04)';
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
