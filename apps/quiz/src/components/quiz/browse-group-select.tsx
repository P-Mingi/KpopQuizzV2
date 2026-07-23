'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { GroupLogo } from '@/components/ui/group-logo';

import type { BrowseGroup } from './browse-quizzes';

// U-5: desktop group filter for /quizzes. The mobile chip scroller has no arrows
// and is awkward on a pointer device, so on desktop the group filter (the
// longest one) becomes a searchable dropdown. This mirrors the create funnel's
// group picker interaction (Q-B1) but as a single-select FILTER: an "All groups"
// option, no custom-group creation. No URL/param change - it drives the same
// apply({ group }) the chips do.

interface Props {
  groups: BrowseGroup[];
  value: string | null;
  onChange: (slug: string | null) => void;
}

export function BrowseGroupSelect({ groups, value, onChange }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? groups.find((g) => g.slug === value) ?? null : null;
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups),
    [groups, q],
  );

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openPanel = (): void => { setOpen(true); setQuery(''); requestAnimationFrame(() => inputRef.current?.focus()); };
  const pick = (slug: string | null): void => { onChange(slug); setOpen(false); setQuery(''); };

  return (
    <div className="bgs" ref={wrapRef}>
      <button
        type="button"
        className={`bgs-trigger${open ? ' open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
      >
        {selected ? (
          <GroupLogo groupName={selected.name} logoUrl={selected.logo_url} displayColor={selected.display_color} textColor={selected.text_color} size={18} />
        ) : null}
        <span className="bgs-trigger-label">{selected ? selected.name : 'All groups'}</span>
        <svg className="bgs-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="bgs-panel">
          <input
            ref={inputRef}
            className="bgs-search"
            type="text"
            role="combobox"
            aria-expanded
            aria-controls="bgs-list"
            placeholder={`Search all ${groups.length} groups...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <ul className="bgs-list" id="bgs-list" role="listbox" aria-label="Groups">
            {!q && (
              <li role="option" aria-selected={value === null}>
                <button type="button" className={`bgs-opt${value === null ? ' on' : ''}`} onClick={() => pick(null)}>
                  <span className="bgs-opt-name">All groups</span>
                </button>
              </li>
            )}
            {matches.map((g) => (
              <li key={g.slug} role="option" aria-selected={value === g.slug}>
                <button type="button" className={`bgs-opt${value === g.slug ? ' on' : ''}`} onClick={() => pick(g.slug)}>
                  <GroupLogo groupName={g.name} logoUrl={g.logo_url} displayColor={g.display_color} textColor={g.text_color} size={18} />
                  <span className="bgs-opt-name">{g.name}</span>
                </button>
              </li>
            ))}
            {q && matches.length === 0 && <li className="bgs-empty" aria-hidden="true">No groups match.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
