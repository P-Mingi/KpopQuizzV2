'use client';

import { useEffect, useState } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';
import { ShareCardModal, type SharePlatform } from './share-card-modal';

// H8 trigger: a Reddit/Discord/X share row that opens the shared customizer
// modal. The creator gets the editor; everyone else gets the read-only card.

const REDDIT = <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.124 1.298zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277z" /></svg>;
const DISCORD = <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>;
const X = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;

const BTNS: Array<{ id: SharePlatform; label: string; icon: React.ReactNode }> = [
  { id: 'reddit', label: 'Reddit', icon: REDDIT },
  { id: 'discord', label: 'Discord', icon: DISCORD },
  { id: 'twitter', label: 'X', icon: X },
];

interface Props {
  quizId: string;
  slug: string;
  quizTitle: string;
  creatorId: string | null;
}

export function QuizShareRow({ quizId, slug, quizTitle, creatorId }: Props): React.ReactElement {
  const [open, setOpen] = useState<SharePlatform | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!creatorId) return;
    const sb = createBrowserClient();
    sb.auth.getUser().then(({ data: { user } }) => setCanEdit(!!user && user.id === creatorId)).catch(() => {});
  }, [creatorId]);

  return (
    <>
      <div className="qsr-row" role="group" aria-label="Share this quiz">
        {BTNS.map((b) => (
          <button key={b.id} type="button" className={`qsr-btn qsr-${b.id}`} onClick={() => setOpen(b.id)} aria-label={`Share to ${b.label}`}>
            {b.icon}{b.label}
          </button>
        ))}
      </div>
      {open && (
        <ShareCardModal quizId={quizId} slug={slug} quizTitle={quizTitle} platform={open} canEdit={canEdit} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
