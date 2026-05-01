export const GROUPS = [
  { slug: 'bts', name: 'BTS', abbr: 'BTS', emoji: '\uD83D\uDC9C',
    bg: 'linear-gradient(170deg, #f0e8f8, #e0d0f0, #d0c0e8)',
    fadeBg: 'rgba(240,232,248,0.88)',
    fadeBgStrong: 'rgba(240,232,248,0.97)',
    textColor: '#8050a0',
    textMuted: 'rgba(128,80,160,0.4)',
    textTags: 'rgba(128,80,160,0.5)',
    accentLight: 'rgba(180,150,220,0.3)',
    accentMid: 'rgba(180,150,220,0.5)',
    bubbleBorder: 'rgba(200,180,230,0.2)',
    starColor: 'rgba(180,150,220,0.25)',
    borderColor: 'rgba(200,180,230,0.5)',
    shadowColor: 'rgba(160,130,210,0.15)',
    ribbonA: 'rgba(180,150,220,0.3)',
    ribbonB: 'rgba(200,180,230,0.5)',
  },
  { slug: 'blackpink', name: 'BLACKPINK', abbr: 'BP', emoji: '\uD83C\uDF53',
    bg: 'linear-gradient(170deg, #fff0f3, #ffe0e8, #ffd0d8)',
    fadeBg: 'rgba(255,248,250,0.88)',
    fadeBgStrong: 'rgba(255,248,250,0.97)',
    textColor: '#d06080',
    textMuted: 'rgba(220,100,140,0.4)',
    textTags: 'rgba(220,100,140,0.5)',
    accentLight: 'rgba(255,150,180,0.3)',
    accentMid: 'rgba(255,200,210,0.5)',
    bubbleBorder: 'rgba(255,200,210,0.2)',
    starColor: 'rgba(255,150,180,0.25)',
    borderColor: 'rgba(255,200,210,0.5)',
    shadowColor: 'rgba(255,150,180,0.15)',
    ribbonA: 'rgba(255,150,180,0.3)',
    ribbonB: 'rgba(255,200,210,0.5)',
  },
  { slug: 'aespa', name: 'aespa', abbr: 'ae', emoji: '\uD83C\uDF43',
    bg: 'linear-gradient(170deg, #e8f5f0, #d0e8e0, #b8d8d0)',
    fadeBg: 'rgba(245,252,248,0.88)',
    fadeBgStrong: 'rgba(245,252,248,0.97)',
    textColor: '#408070',
    textMuted: 'rgba(80,150,130,0.4)',
    textTags: 'rgba(80,150,130,0.5)',
    accentLight: 'rgba(130,200,180,0.3)',
    accentMid: 'rgba(150,210,190,0.5)',
    bubbleBorder: 'rgba(160,220,200,0.2)',
    starColor: 'rgba(130,200,180,0.25)',
    borderColor: 'rgba(150,220,200,0.5)',
    shadowColor: 'rgba(130,200,180,0.15)',
    ribbonA: 'rgba(130,200,180,0.3)',
    ribbonB: 'rgba(150,220,200,0.5)',
  },
  { slug: 'stray-kids', name: 'Stray Kids', abbr: 'SKZ', emoji: '\uD83C\uDF51',
    bg: 'linear-gradient(170deg, #fff0e8, #ffe0d0, #f0d0c0)',
    fadeBg: 'rgba(255,248,242,0.88)',
    fadeBgStrong: 'rgba(255,248,242,0.97)',
    textColor: '#c06030',
    textMuted: 'rgba(200,120,80,0.4)',
    textTags: 'rgba(200,120,80,0.5)',
    accentLight: 'rgba(255,180,140,0.3)',
    accentMid: 'rgba(255,200,170,0.5)',
    bubbleBorder: 'rgba(255,200,170,0.2)',
    starColor: 'rgba(255,180,140,0.25)',
    borderColor: 'rgba(255,200,170,0.5)',
    shadowColor: 'rgba(255,160,120,0.15)',
    ribbonA: 'rgba(255,180,140,0.3)',
    ribbonB: 'rgba(255,200,170,0.5)',
  },
  { slug: 'newjeans', name: 'NewJeans', abbr: 'NJ', emoji: '\uD83E\uDEE7',
    bg: 'linear-gradient(170deg, #e8f0ff, #d0e0f8, #c0d0f0)',
    fadeBg: 'rgba(242,248,255,0.88)',
    fadeBgStrong: 'rgba(242,248,255,0.97)',
    textColor: '#4070b0',
    textMuted: 'rgba(80,120,180,0.4)',
    textTags: 'rgba(80,120,180,0.5)',
    accentLight: 'rgba(140,180,240,0.3)',
    accentMid: 'rgba(170,200,250,0.5)',
    bubbleBorder: 'rgba(180,210,255,0.2)',
    starColor: 'rgba(140,180,240,0.25)',
    borderColor: 'rgba(170,200,250,0.5)',
    shadowColor: 'rgba(140,180,240,0.15)',
    ribbonA: 'rgba(140,180,240,0.3)',
    ribbonB: 'rgba(170,200,250,0.5)',
  },
] as const;

export const RARITY_CONFIG = {
  R: {
    label: 'R', order: 1, drop: '60%', color: '#888780',
    borderWidth: 2, bubbleCount: 0, starCount: 2,
    glowSpread: 0, badgeSize: 22, shimmer: false,
  },
  S: {
    label: 'S', order: 2, drop: '28%', color: '#378ADD',
    borderWidth: 2.5, bubbleCount: 3, starCount: 3,
    glowSpread: 15, badgeSize: 24, shimmer: false,
  },
  SS: {
    label: 'SS', order: 3, drop: '10%', color: '#D4537E',
    borderWidth: 3, bubbleCount: 4, starCount: 4,
    glowSpread: 22, badgeSize: 26, shimmer: true,
  },
  SSS: {
    label: 'SSS', order: 4, drop: '2%', color: '#EF9F27',
    borderWidth: 3, bubbleCount: 5, starCount: 5,
    glowSpread: 30, badgeSize: 28, shimmer: true,
  },
} as const;

export type Rarity = keyof typeof RARITY_CONFIG;

export function getGroupMeta(slug: string) {
  return GROUPS.find(g => g.slug === slug) ?? GROUPS[1]!;
}

export function getDecoPositions(cardIndex: number, count: number, type: 'bubble' | 'star') {
  const seed = cardIndex * 7 + (type === 'star' ? 31 : 0);
  return Array.from({ length: count }, (_, i) => {
    const s = seed + i * 13;
    return {
      top: 8 + ((s * 37) % 55),
      left: type === 'bubble' ? 10 + ((s * 53) % 75) : 8 + ((s * 41) % 80),
      size: type === 'bubble' ? 8 + ((s * 23) % 12) : 4 + ((s * 19) % 4),
      hasBorder: type === 'bubble' && i < 2,
    };
  });
}
