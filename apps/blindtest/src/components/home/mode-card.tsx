'use client';

interface Props {
  name: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Quick play / Challenge mode picker on the home lobby.
 */
export function ModeCard({ name, description, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-3.5 rounded-[14px] border-[1.5px] text-center transition-colors active:scale-[0.98] ${
        active
          ? 'border-accent bg-accent-bg'
          : 'border-default bg-surface hover:border-accent'
      }`}
    >
      <span className="block text-[13px] font-semibold text-primary">{name}</span>
      <span className={`block text-[10px] mt-1 ${active ? 'text-accent' : 'text-ghost'}`}>
        {description}
      </span>
    </button>
  );
}
