'use client';

import { Mention } from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import type { EntityHit } from '@/app/api/verse/entities/search/route';

// W3.3 - @-mention entity picker. Typing "@" opens a live search of idols /
// albums / groups; selecting inserts a linked chip carrying the entity's Verse
// URL. No extra popup dependency: a small positioned React list.

interface ListHandle { onKeyDown: (p: { event: KeyboardEvent }) => boolean; }

const MentionList = forwardRef<ListHandle, { items: EntityHit[]; command: (i: { id: string; label: string }) => void }>(
  function MentionList({ items, command }, ref) {
    const [sel, setSel] = useState(0);
    useEffect(() => setSel(0), [items]);
    const pick = (i: number) => { const it = items[i]; if (it) command({ id: it.href, label: it.label }); };
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') { setSel((s) => (s + items.length - 1) % items.length); return true; }
        if (event.key === 'ArrowDown') { setSel((s) => (s + 1) % items.length); return true; }
        if (event.key === 'Enter') { pick(sel); return true; }
        return false;
      },
    }));
    if (!items.length) return <div className="verse-mention-pop"><div className="px-3 py-2 text-xs text-tertiary">No matches</div></div>;
    return (
      <div className="verse-mention-pop" role="listbox">
        {items.map((it, i) => (
          <button key={it.href} type="button" role="option" aria-selected={i === sel}
            onMouseEnter={() => setSel(i)} onMouseDown={(e) => { e.preventDefault(); pick(i); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
            style={{ background: i === sel ? 'var(--verse-soft)' : 'transparent' }}>
            <span className="rounded px-1 text-[9px] font-bold uppercase" style={{ background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' }}>{it.type}</span>
            <span className="truncate font-semibold text-primary">{it.label}</span>
            <span className="ml-auto truncate text-[11px] text-tertiary">{it.sub}</span>
          </button>
        ))}
      </div>
    );
  },
);

export const verseMention = Mention.configure({
  HTMLAttributes: { class: 'verse-mention' },
  renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
  suggestion: {
    char: '@',
    items: async ({ query }: { query: string }): Promise<EntityHit[]> => {
      if (!query) return [];
      try {
        const res = await fetch(`/api/verse/entities/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        return (data.results ?? []) as EntityHit[];
      } catch { return []; }
    },
    render: () => {
      let component: ReactRenderer<ListHandle> | null = null;
      let el: HTMLDivElement | null = null;
      const place = (rect: DOMRect | null) => {
        if (!el || !rect) return;
        el.style.position = 'absolute';
        el.style.left = `${rect.left + window.scrollX}px`;
        el.style.top = `${rect.bottom + window.scrollY + 4}px`;
        el.style.zIndex = '50';
      };
      return {
        onStart: (props: { editor: unknown; clientRect?: (() => DOMRect | null) | null }) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor as never });
          el = document.createElement('div');
          el.appendChild(component.element);
          document.body.appendChild(el);
          place(props.clientRect?.() ?? null);
        },
        onUpdate: (props: { clientRect?: (() => DOMRect | null) | null }) => { component?.updateProps(props); place(props.clientRect?.() ?? null); },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === 'Escape') { return true; }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => { el?.remove(); component?.destroy(); el = null; component = null; },
      };
    },
  },
});
