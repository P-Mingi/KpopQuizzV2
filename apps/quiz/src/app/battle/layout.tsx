import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Battle Rooms - kpopquiz',
  description: 'Real-time K-pop trivia battles with friends',
};

export default function BattleLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <style>{`
        /* Battle-specific responsive overrides */
        @media (max-width: 767px) {
          /* Hub: stack CTA cards */
          .battle-cta-grid { grid-template-columns: 1fr !important; }
          /* Hub: stack how-it-works to 2 columns */
          .battle-steps-grid { grid-template-columns: 1fr 1fr !important; }
          /* Hub: stack recent rooms */
          .battle-recent-grid { grid-template-columns: 1fr !important; }
          /* Join: single column */
          .battle-join-grid { grid-template-columns: 1fr !important; }
          .battle-join-sidebar { display: none !important; }
          /* Question form: single column */
          .battle-form-grid { grid-template-columns: 1fr !important; }
          /* Room: stack 3-column to single */
          .battle-room-cols { flex-direction: column !important; }
          .battle-room-cols > aside { width: 100% !important; border-left: none !important; border-top: 1px solid #e8e6e0 !important; max-height: 200px; }
          .battle-room-cols > aside:last-child { display: none !important; }
        }
      `}</style>
      {children}
    </>
  );
}
