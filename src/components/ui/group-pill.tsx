interface GroupPillProps {
  name: string;
  displayColor: string;
  textColor: string;
  size?: 'sm' | 'md';
}

export function GroupPill({ name, displayColor, textColor, size = 'sm' }: GroupPillProps): React.ReactElement {
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2.5 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-block font-medium rounded-full ${sizeClasses}`}
      style={{ backgroundColor: displayColor, color: textColor }}
    >
      {name}
    </span>
  );
}
