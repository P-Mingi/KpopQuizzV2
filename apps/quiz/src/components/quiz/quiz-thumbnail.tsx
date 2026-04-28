import { getGroupMeta } from '@/lib/cards/constants';

interface QuizThumbnailProps {
  imageUrl?: string | null;
  groupTag?: string;
  size?: number;
}

export function QuizThumbnail({ imageUrl, groupTag, size = 56 }: QuizThumbnailProps) {
  if (imageUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8, flexShrink: 0,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
    );
  }

  const g = groupTag ? getGroupMeta(groupTag.toLowerCase().replace(/ /g, '-')) : null;

  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: g ? g.bg : 'linear-gradient(135deg, #f0e8f8, #d0c0e8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        fontSize: Math.round(size * 0.18),
        fontWeight: 800,
        color: g ? g.textColor : '#8050a0',
        opacity: 0.6,
      }}>{g ? g.abbr : '?'}</span>
    </div>
  );
}
