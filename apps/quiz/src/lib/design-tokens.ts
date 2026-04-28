// -- BUTTON VARIANTS --
export const BUTTON_STYLES = {
  primary: {
    padding: '8px 16px', borderRadius: 10,
    background: '#D4537E', color: '#fff', border: 'none',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(212,83,126,0.2)',
  },
  secondary: {
    padding: '8px 16px', borderRadius: 10,
    background: 'rgba(212,83,126,0.06)', color: '#D4537E',
    border: '1px solid rgba(212,83,126,0.15)',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  ghost: {
    padding: '8px 16px', borderRadius: 10,
    background: 'transparent', color: '#888780',
    border: '1px solid #e8e6e0',
    fontSize: 11, fontWeight: 500, cursor: 'pointer',
  },
  danger: {
    padding: '8px 16px', borderRadius: 10,
    background: '#e74c3c', color: '#fff', border: 'none',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
} as const;

// -- TAG COLORS BY CATEGORY --
export const TAG_COLORS = {
  type: {
    Classic: { background: 'rgba(212,83,126,0.08)', color: '#D4537E' },
    Image: { background: 'rgba(74,144,208,0.08)', color: '#4a90d0' },
    Intruder: { background: 'rgba(154,122,204,0.08)', color: '#9a7acc' },
    'True/False': { background: 'rgba(39,174,96,0.08)', color: '#27ae60' },
    Clues: { background: 'rgba(232,160,96,0.08)', color: '#e8a060' },
  },
  difficulty: {
    Easy: { background: 'rgba(39,174,96,0.08)', color: '#27ae60' },
    Medium: { background: 'rgba(232,160,96,0.08)', color: '#e8a060' },
    Hard: { background: 'rgba(231,76,60,0.08)', color: '#e74c3c' },
  },
  group: { background: 'rgba(128,80,160,0.08)', color: '#8050a0' },
} as const;

export const TAG_BASE_STYLE = {
  fontSize: 9, fontWeight: 600,
  padding: '3px 8px', borderRadius: 6,
  display: 'inline-block',
} as const;

export function getTagStyle(category: 'type' | 'difficulty' | 'group', value?: string) {
  if (category === 'group') return { ...TAG_BASE_STYLE, ...TAG_COLORS.group };
  const colors = TAG_COLORS[category] as Record<string, { background: string; color: string }>;
  const match = value ? colors[value] : undefined;
  return { ...TAG_BASE_STYLE, ...(match || TAG_COLORS.type.Classic) };
}
