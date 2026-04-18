export const ORPHAN_KEY = '__orphan__';

export const accordionEase = [0.22, 1, 0.36, 1] as const;

/** Idle = single icon width only; armed grows so title/metadata flex in without a permanent gap. */
export const DELETE_SLOT_IDLE_PX = 36;
export const DELETE_SLOT_ARMED_PX = 76;

export const PERSON_COLOR_SHADES = [
  { background: '#f0fffa', border: '#00ff88', text: '#00cc6a' },
  { background: '#e6fffa', border: '#00e074', text: '#00b359' },
  { background: '#dcfdf7', border: '#00d15a', text: '#009944' },
  { background: '#d1fae5', border: '#00c249', text: '#007f30' },
] as const;
