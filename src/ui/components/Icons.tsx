const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const IconToday = () => (
  <svg viewBox="0 0 24 24" {...common}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const IconCards = () => (
  <svg viewBox="0 0 24 24" {...common}><rect x="4" y="6" width="14" height="14" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v11" /></svg>
);
export const IconPlan = () => (
  <svg viewBox="0 0 24 24" {...common}><path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" /></svg>
);
export const IconChart = () => (
  <svg viewBox="0 0 24 24" {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconMore = () => (
  <svg viewBox="0 0 24 24" {...common}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
);
export const IconSpeaker = () => (
  <svg viewBox="0 0 24 24" {...common} width="20" height="20"><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);
export const IconMic = () => (
  <svg viewBox="0 0 24 24" {...common} width="20" height="20"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
