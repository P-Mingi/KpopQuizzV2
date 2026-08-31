import { AvatarStudio } from '@/components/avatar/avatar-studio';

import type { Metadata } from 'next';

// FROZEN (M1.27). The avatar builder is intentionally NOT shipped to users:
//   1. no links point here from anywhere in the app,
//   2. robots noindex/nofollow below,
//   3. '/avatar-studio' is deliberately absent from KNOWN_ROUTES in middleware.ts,
//      so the route 301s to / in production.
// Code + assets are kept on purpose so the work can resume. To UNFREEZE: add
// '/avatar-studio' to KNOWN_ROUTES, flip robots to index, and apply migration 103
// (avatar_config column + avatars storage bucket) which Save depends on.
export const metadata: Metadata = {
  title: 'Avatar studio',
  description: 'Build your kawaii K-pop fan avatar: hair, clothes, hats, and more.',
  robots: { index: false, follow: false }, // frozen, keep out of search
};

export default function AvatarStudioPage(): React.ReactElement {
  return (
    <div style={{ paddingTop: 16, paddingBottom: 36, paddingLeft: 14, paddingRight: 14 }}>
      <header style={{ maxWidth: 1040, margin: '0 auto 14px', textAlign: 'center' }}>
        <h1
          className="font-display"
          style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}
        >
          Avatar studio
        </h1>
        <p style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 6 }}>
          Dress up your fan. Mix hair, clothes, and accessories.
        </p>
      </header>
      <AvatarStudio />
    </div>
  );
}
