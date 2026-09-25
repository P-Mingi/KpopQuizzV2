'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

import { Icon } from '@/components/ux-v1/icon';

import { SearchResults } from './slots';

const Ctx = createContext<() => void>(() => {});

/** Opens the search overlay from anywhere under the shell (e.g. a "Search" link on a page). */
export function useUxSearch(): () => void { return useContext(Ctx); }

function isTyping(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
}

/**
 * Search overlay host (DESIGN-SPEC 16.5 / 17.1): the nav's icon button and the "/"
 * key open it; Escape, the backdrop and choosing a result close it; focus returns
 * to the trigger. Enter goes to the full /search page. Results content is P11's
 * slot (./slots SearchResults).
 */
export function UxSearchProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [mounted, setMounted] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const show = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setQ('');
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    const o = opener.current;
    if (o && document.contains(o)) o.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === '/' && !open && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(document.activeElement)) {
        if (document.querySelector('[aria-modal="true"]')) return;
        e.preventDefault();
        show();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, show]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => input.current?.focus(), 30);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        // keep focus inside the overlay
        const box = document.getElementById('ux-sov');
        const items = Array.from(box?.querySelectorAll<HTMLElement>('input, a[href], button') ?? []);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', onKey, true); root.style.overflow = prev; };
  }, [open, close]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const value = useMemo(() => show, [show]);

  return (
    <Ctx value={value}>
      {children}
      {mounted && open ? createPortal(
        <div className="ux-layer">
          <div className="ux-scrim" onClick={close} aria-hidden="true" data-testid="ux-scrim" />
          <div className="ux-sov" id="ux-sov" role="dialog" aria-modal="true" aria-label="Search">
            <form className="ux-sov-in" role="search" onSubmit={submit}>
              <Icon name="search" className="ux-muted" />
              <label className="ux-sr" htmlFor="ux-sq">Search quizzes, groups, songs</label>
              <input
                ref={input}
                id="ux-sq"
                type="search"
                placeholder="Search quizzes, groups, songs"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <kbd className="ux-kbd">Esc</kbd>
            </form>
            <div className="ux-sov-b">
              <SearchResults query={q.trim()} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </Ctx>
  );
}
