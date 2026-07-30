// Badge redesign - one consistent 1.9px line-icon set, keyed by badge id. Simple,
// recognizable silhouettes; families (creator tiers, streaks) share/escalate icons
// on purpose so they read as families. Rendered inside the rarity coin.

const ICON: Record<string, React.ReactElement> = {
  play: <path d="M8 5.5v13l11-6.5z" />,
  pencil: <><path d="M5 19h3.5L19 8.5a2 2 0 0 0-3-3L5.5 16z" /><path d="M14 7l3 3" /></>,
  card: <><rect x="6.5" y="4" width="11" height="16" rx="2.2" /><path d="M9.5 8.5h5M9.5 12h5" /></>,
  flame: <path d="M12 3c1 3-2.2 4.3-2.2 7.3A2.2 2.2 0 0 0 12 12.5a2.2 2.2 0 0 0 2.2-2.3c1.5 1.2 2.3 3 2.3 4.8a4.5 4.5 0 0 1-9 0C7.5 11 10.5 9 12 3z" />,
  globe: <><circle cx="12" cy="12" r="8.4" /><path d="M3.6 12h16.8" /><path d="M12 3.6c2.8 2.6 2.8 14.2 0 16.8M12 3.6c-2.8 2.6-2.8 14.2 0 16.8" /></>,
  calendar: <><rect x="4.5" y="5.5" width="15" height="14" rx="2.2" /><path d="M4.5 10h15M8.5 3.5v4M15.5 3.5v4" /></>,
  target: <><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="3.6" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  layers: <><path d="M12 3.2l8.5 4.6L12 12.4 3.5 7.8z" /><path d="M3.5 12.4L12 17l8.5-4.6" /></>,
  trophy: <><path d="M7 4.5h10v4.5a5 5 0 0 1-10 0z" /><path d="M17 4.5h3v1.8a3 3 0 0 1-3 3M7 4.5H4v1.8a3 3 0 0 0 3 3" /><path d="M12 14v3.5M9 20.5h6M10.2 17.5h3.6" /></>,
  medal: <><circle cx="12" cy="14.5" r="5" /><path d="M8.7 3.5l3.3 6.3 3.3-6.3" /><path d="M12 12.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 14.4l2-.3z" /></>,
  cards: <><rect x="8" y="6" width="10.5" height="14" rx="2.2" /><path d="M5.5 5.2v11.6a2.4 2.4 0 0 0 2.4 2.4" /></>,
  heart: <path d="M12 20.5C7.2 16.7 4.3 13.4 4.3 10A3.7 3.7 0 0 1 12 8.5 3.7 3.7 0 0 1 19.7 10c0 3.4-2.9 6.7-7.7 10.5z" />,
  rocket: <><path d="M12 3.2c2.9 1.2 4.6 4 4.6 7.6L15 15H9l-1.6-4.2c0-3.6 1.7-6.4 4.6-7.6z" /><circle cx="12" cy="9.2" r="1.6" /><path d="M9 15l-2 3.6 2.6-.9M15 15l2 3.6-2.6-.9" /></>,
  grid: <><rect x="4.2" y="4.2" width="6.6" height="6.6" rx="1.6" /><rect x="13.2" y="4.2" width="6.6" height="6.6" rx="1.6" /><rect x="4.2" y="13.2" width="6.6" height="6.6" rx="1.6" /><rect x="13.2" y="13.2" width="6.6" height="6.6" rx="1.6" /></>,
  crown: <><path d="M4 8.5l3.3 8.5h9.4L20 8.5l-5 4-3-6.2-3 6.2z" /><path d="M7.3 20h9.4" /></>,
  gem: <><path d="M7 4h10l3.2 5.2L12 20.4 3.8 9.2z" /><path d="M3.8 9.2h16.4M9.4 4L7 9.2l5 11.2 5-11.2L14.6 4" /></>,
  lightning: <path d="M13 2.5L4.5 14H10l-1 7.5L19.5 10H13z" />,
};

const BADGE_ICON_KEY: Record<string, string> = {
  first_steps: 'play', quiz_maker: 'pencil', pc_first: 'card',
  hard_mode: 'flame', multi_stan: 'globe', streak_7: 'calendar',
  perfect_score: 'target', prolific_creator: 'layers', dedicated_fan: 'trophy', creator_bronze: 'medal', pc_collector: 'cards',
  community_star: 'heart', viral_hit: 'rocket', streak_30: 'flame', creator_silver: 'medal', pc_set: 'grid',
  group_master: 'crown', founding_fan: 'gem', streak_100: 'lightning', creator_gold: 'medal',
};

export function BadgeIcon({ id, size = 26 }: { id: string; size?: number }): React.ReactElement {
  const key = BADGE_ICON_KEY[id] ?? 'target';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[key]}
    </svg>
  );
}
