'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface ShelfCard { item_type: string; item_id: number; name: string; era: string | null; version: string | null; groupName: string; href: string }

// V-CARDS-MAX step 4 - the owner's showcase controls on their profile (client
// island, like ProfileOwnerControls). Renders nothing for visitors. Holds the
// opt-in toggle (default OFF) and the pin list with remove; pinning happens from
// each card's page. The public render of the showcase is server-side.
export function ShelfManager({ profileUsername }: { profileUsername: string }): React.ReactElement | null {
  const [isOwner, setIsOwner] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [cards, setCards] = useState<ShelfCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadShelf = useCallback(() => {
    fetch('/api/verse/shelf').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.signedIn) { setIsPublic(!!d.isPublic); setCards(d.cards ?? []); } }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' }).then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: { username: string } | null }) => { const own = d.profile?.username === profileUsername; setIsOwner(own); if (own) loadShelf(); })
      .catch(() => {}).finally(() => setLoaded(true));
  }, [profileUsername, loadShelf]);

  async function toggle(next: boolean): Promise<void> {
    setIsPublic(next);
    await fetch('/api/verse/shelf', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_public: next }) });
  }
  async function remove(c: ShelfCard): Promise<void> {
    setCards((cs) => cs.filter((x) => !(x.item_type === c.item_type && x.item_id === c.item_id)));
    await fetch('/api/verse/shelf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_type: c.item_type, item_id: c.item_id, action: 'unpin' }) });
  }

  if (!loaded || !isOwner) return null;

  return (
    <section aria-label="Your showcase" className="mx-auto mt-4 w-full max-w-[520px] rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Your card showcase</h2>
          <p className="mt-0.5 text-xs text-secondary">Up to 5 cards. {cards.length ? `${cards.length} pinned.` : 'Pin from any card page.'}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          <input type="checkbox" checked={isPublic} onChange={(e) => void toggle(e.target.checked)} className="h-4 w-4" />
          Show on my public profile
        </label>
      </div>

      {cards.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {cards.map((c) => (
            <li key={`${c.item_type}:${c.item_id}`} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: 'var(--border)' }}>
              <Link href={c.href} className="font-semibold no-underline" style={{ color: 'var(--text-primary)' }}>{c.name}</Link>
              <button type="button" onClick={() => void remove(c)} aria-label={`Remove ${c.name} from your showcase`} className="v-tap text-tertiary hover:text-secondary">×</button>
            </li>
          ))}
        </ul>
      ) : null}
      {!isPublic ? <p className="mt-2 text-[11px] text-tertiary">Your showcase is private until you turn this on.</p> : null}
    </section>
  );
}
