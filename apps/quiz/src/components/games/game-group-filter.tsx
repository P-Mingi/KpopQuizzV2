'use client';

const GAME_GROUPS = ['All', 'BTS', 'BLACKPINK', 'SEVENTEEN', 'Stray Kids', 'aespa', 'TWICE', 'NewJeans', 'IVE', 'EXO'];

interface GameGroupFilterProps {
  activeGroup: string;
  onGroupChange: (group: string) => void;
}

export function GameGroupFilter({ activeGroup, onGroupChange }: GameGroupFilterProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, zIndex: 3,
        background: 'linear-gradient(90deg, transparent, var(--bg-primary))',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, paddingRight: 40, scrollbarWidth: 'none' }}>
        {GAME_GROUPS.map(g => (
          <button key={g} onClick={() => onGroupChange(g)} style={{
            padding: '6px 14px', borderRadius: 8, whiteSpace: 'nowrap',
            fontSize: 10, fontWeight: activeGroup === g ? 600 : 500, cursor: 'pointer',
            background: activeGroup === g ? '#D4537E' : '#fff',
            color: activeGroup === g ? '#fff' : '#888780',
            border: `1px solid ${activeGroup === g ? '#D4537E' : '#e8e6e0'}`,
            transition: 'all 0.15s',
          }}>{g}</button>
        ))}
      </div>
    </div>
  );
}
