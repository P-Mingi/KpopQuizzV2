import Image from 'next/image';

// F1: the ONE reusable mascot component. Every placement of the bunny goes
// through here (no scattered <img>). Renders the right PNG at an explicit
// width/height (no layout shift). Animations live in globals.css and are gated
// under prefers-reduced-motion; sad + sleep never animate.

export type MascotVariant = 'default' | 'celebrate' | 'sad' | 'think' | 'sleep';
export type MascotAnimate = 'bob' | 'tilt' | 'none';

const SRC: Record<MascotVariant, string> = {
  default: '/mascot/mascot-default.png',
  celebrate: '/mascot/mascot-celebrate.png',
  sad: '/mascot/mascot-sad.png',
  think: '/mascot/mascot-think.png',
  sleep: '/mascot/mascot-sleep.png',
};

const DEFAULT_ALT: Record<MascotVariant, string> = {
  default: 'KpopQuiz bunny mascot',
  celebrate: 'KpopQuiz bunny mascot celebrating',
  sad: 'KpopQuiz bunny mascot looking sad',
  think: 'KpopQuiz bunny mascot thinking',
  sleep: 'KpopQuiz bunny mascot sleeping',
};

interface MascotProps {
  variant?: MascotVariant;
  animate?: MascotAnimate;
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}

export function Mascot({
  variant = 'default',
  animate = 'none',
  size = 104,
  className,
  alt,
  priority = false,
}: MascotProps): React.ReactElement {
  // Sad + sleep are always static, even if an animation is requested.
  const motion: MascotAnimate = variant === 'sad' || variant === 'sleep' ? 'none' : animate;
  const animClass = motion === 'bob' ? 'mascot-bob' : motion === 'tilt' ? 'mascot-tilt' : '';
  const cls = ['mascot', animClass, className].filter(Boolean).join(' ');

  return (
    <Image
      src={SRC[variant]}
      alt={alt ?? DEFAULT_ALT[variant]}
      width={size}
      height={size}
      className={cls}
      priority={priority}
    />
  );
}
