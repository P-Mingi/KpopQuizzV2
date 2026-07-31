'use client';

import { useEffect, useRef } from 'react';

// V-PAGES step 4 - THE RABBIT-HOLE FEEL. Progressive enhancement over the
// server-rendered prose in scope:
//   1. Hover/focus previews on internal Verse links (wiki pages, albums,
//      members): a small floating card with title, kind and excerpt. Data from
//      /api/verse/preview (published-only; drafts are indistinguishable from
//      absence). Keyboard: focus shows, blur/Escape hides. No animation, so
//      reduced-motion needs no special-casing.
//   2. RED LINKS: wiki links whose target does not exist. Visitors get plain
//      text (the anchor is neutralized: no dead affordance). When createHref is
//      provided (contributor+, wired at step 5), the link stays and the card
//      offers "Create this page". JS-off fallback: the anchor leads to the
//      on-brand wiki 404 with a search box, which is helpful, not dead.

interface Preview { title?: string; kind?: string; excerpt?: string; fanWritten?: boolean; missing?: boolean }

export function LinkPreviews({ groupSlug, scopeSelector = '.verse-prose', createHref = null }: {
  groupSlug: string;
  scopeSelector?: string;
  /** e.g. `/verse/{slug}/wiki/new` once the creator route exists; null = the
   * red-link create affordance is off and missing links neutralize for all. */
  createHref?: string | null;
}): null {
  const cacheRef = useRef(new Map<string, Preview>());

  useEffect(() => {
    const cache = cacheRef.current;
    const scopes = [...document.querySelectorAll(scopeSelector)];
    if (!scopes.length) return;

    const card = document.createElement('div');
    card.setAttribute('role', 'status');
    card.setAttribute('aria-hidden', 'true');
    card.style.cssText = 'position:fixed;z-index:60;max-width:280px;padding:10px 12px;border-radius:12px;border:1px solid var(--v-hairline,rgba(0,0,0,.12));background:var(--bg-surface,#fff);box-shadow:0 10px 30px rgba(0,0,0,.18);font-size:12.5px;line-height:1.45;color:var(--text-secondary,#555);pointer-events:none;display:none';
    document.body.appendChild(card);

    const wikiRe = new RegExp(`^/verse/${groupSlug}/wiki/([a-z0-9-]+)$`);
    const entityRe = new RegExp(`^/verse/${groupSlug}/(albums|members)/([a-z0-9-]+)$`);

    const anchorsIn = (root: Element): HTMLAnchorElement[] =>
      [...root.querySelectorAll<HTMLAnchorElement>('a[href^="/verse/"]')];

    const show = (a: HTMLAnchorElement, p: Preview): void => {
      if (p.missing && !createHref) return;
      const title = p.missing ? 'This page does not exist yet' : (p.title ?? '');
      if (!title) return;
      const sub = p.missing ? 'Create this page from here' : [p.kind, p.fanWritten ? 'fan-written' : null].filter(Boolean).join(' · ');
      card.innerHTML = `<div style="font-weight:700;color:var(--text-primary,#111)">${title.replace(/</g, '&lt;')}</div>`
        + (sub ? `<div style="margin-top:2px;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary,#888)">${sub.replace(/</g, '&lt;')}</div>` : '')
        + (p.excerpt ? `<div style="margin-top:5px">${p.excerpt.replace(/</g, '&lt;')}</div>` : '');
      const r = a.getBoundingClientRect();
      card.style.display = 'block';
      const top = r.bottom + 8 + 210 > window.innerHeight ? Math.max(8, r.top - card.offsetHeight - 8) : r.bottom + 8;
      card.style.top = `${top}px`;
      card.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - 296)}px`;
    };
    const hide = (): void => { card.style.display = 'none'; };

    const fetchPreview = async (href: string): Promise<Preview | null> => {
      if (cache.has(href)) return cache.get(href)!;
      const w = href.match(wikiRe);
      const e = href.match(entityRe);
      let url: string | null = null;
      if (w) url = `/api/verse/preview?group=${groupSlug}&wiki=${w[1]}`;
      else if (e) url = `/api/verse/preview?group=${groupSlug}&entity=${e[1]}&e=${e[2]}`;
      if (!url) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const p = (await res.json()) as Preview;
        cache.set(href, p);
        return p;
      } catch { return null; }
    };

    const onEnter = (ev: Event): void => {
      const a = (ev.target as Element).closest?.('a[href^="/verse/"]') as HTMLAnchorElement | null;
      if (!a) return;
      void fetchPreview(a.getAttribute('href') ?? '').then((p) => {
        if (p && a.matches(':hover, :focus')) show(a, p);
      });
    };
    const onKey = (ev: KeyboardEvent): void => { if (ev.key === 'Escape') hide(); };

    for (const scope of scopes) {
      scope.addEventListener('mouseover', onEnter);
      scope.addEventListener('focusin', onEnter);
      scope.addEventListener('mouseout', hide);
      scope.addEventListener('focusout', hide);
    }
    document.addEventListener('keydown', onKey);

    // RED LINKS: batch-check every wiki link in scope once.
    const wikiAnchors = scopes.flatMap(anchorsIn).filter((a) => wikiRe.test(a.getAttribute('href') ?? ''));
    const slugs = [...new Set(wikiAnchors.map((a) => a.getAttribute('href')!.match(wikiRe)![1]!))];
    if (slugs.length) {
      void fetch(`/api/verse/preview?group=${groupSlug}&exists=${slugs.slice(0, 40).join(',')}`)
        .then((r) => (r.ok ? r.json() : { missing: [] }))
        .then(({ missing }: { missing: string[] }) => {
          const gone = new Set(missing);
          for (const a of wikiAnchors) {
            const slug = a.getAttribute('href')!.match(wikiRe)![1]!;
            if (!gone.has(slug)) continue;
            if (createHref) {
              a.setAttribute('data-wiki-missing', 'true');
              a.style.textDecorationStyle = 'dashed';
              a.href = `${createHref}?slug=${encodeURIComponent(slug)}`;
              cache.set(`/verse/${groupSlug}/wiki/${slug}`, { missing: true });
            } else {
              // Visitors: plain text, never a dead affordance.
              const span = document.createElement('span');
              span.textContent = a.textContent;
              a.replaceWith(span);
            }
          }
        })
        .catch(() => undefined);
    }

    return () => {
      for (const scope of scopes) {
        scope.removeEventListener('mouseover', onEnter);
        scope.removeEventListener('focusin', onEnter);
        scope.removeEventListener('mouseout', hide);
        scope.removeEventListener('focusout', hide);
      }
      document.removeEventListener('keydown', onKey);
      card.remove();
    };
  }, [groupSlug, scopeSelector, createHref]);

  return null;
}
