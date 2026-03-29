interface LevelBadgeProps {
  level: number;
  name: string;
  size?: 'sm' | 'md';
}

export function LevelBadge({ level, name, size = 'sm' }: LevelBadgeProps): React.ReactElement {
  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-[#EEEDFE] text-[#3C3489] ${sizeClass}`}>
      Lv.{level} {name}
    </span>
  );
}
