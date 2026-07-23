'use client';

import { useMemo, useRef, useState } from 'react';

import type { FunnelGroup } from './create-funnel';

// Q-B1: searchable group picker over EVERY group in the database (getAllGroups
// passes the full set in). Type to filter, arrow keys + Enter to pick. The full
// list is browsable in the scrollable panel below - no group is hidden. A
// "New group or artist" row is pinned FIRST; clicking it opens a name-entry
// field that routes to the EXISTING custom-group API path (create/route.ts
// resolves group_name -> a new is_custom group in the DB).

interface GroupPickerProps {
  groups: FunnelGroup[];
  selectedSlug: string | null;
  customGroup: string | null;
  onSelect: (slug: string) => void;
  onCreateCustom: (name: string) => void;
  onClear: () => void;
}

export function GroupPicker({
  groups, selectedSlug, customGroup, onSelect, onCreateCustom, onClear,
}: GroupPickerProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const selectedGroup = selectedSlug ? groups.find((g) => g.slug === selectedSlug) ?? null : null;
  const q = query.trim().toLowerCase();

  // Every matching group is shown (the panel scrolls); nothing is capped, so any
  // group in the DB is reachable by scrolling or searching.
  const matches = useMemo(
    () => (q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups),
    [groups, q],
  );

  // A group (existing or custom) is already chosen: show it as a filled row.
  if (selectedGroup || customGroup) {
    const label = selectedGroup ? selectedGroup.name : customGroup;
    return (
      <div className="gp-selected">
        <span className="gp-selected-name">
          {label}
          {customGroup && <span className="gp-selected-new">new group</span>}
        </span>
        <button
          type="button"
          className="gp-change"
          onClick={() => { onClear(); setQuery(''); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); }}
        >
          Change
        </button>
      </div>
    );
  }

  const enterCreate = (): void => {
    setNewName(query.trim());
    setCreating(true);
    requestAnimationFrame(() => newInputRef.current?.focus());
  };

  const submitCreate = (): void => {
    const name = newName.trim();
    if (name.length < 2) return;
    onCreateCustom(name);
    setCreating(false);
    setNewName('');
    setQuery('');
  };

  // Create mode: a dedicated name-entry field for a brand-new group or artist.
  if (creating) {
    return (
      <div className="gp-wrap">
        <div className="gp-create">
          <label className="gp-create-label" htmlFor="gp-new">New group or artist</label>
          <input
            id="gp-new"
            ref={newInputRef}
            className="cf-input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submitCreate(); }
              else if (e.key === 'Escape') { setCreating(false); }
            }}
            placeholder="e.g. Cortis"
            maxLength={60}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="gp-create-actions">
            <button type="button" className="gp-create-cancel" onClick={() => setCreating(false)}>Cancel</button>
            <button type="button" className="gp-create-go" disabled={newName.trim().length < 2} onClick={submitCreate}>Create group</button>
          </div>
        </div>
      </div>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches.length > 0) { onSelect(matches[active]!.slug); setQuery(''); setActive(0); }
      else if (query.trim().length >= 2) { enterCreate(); }
    }
  };

  return (
    <div className="gp-wrap">
      <input
        ref={inputRef}
        className="cf-input gp-input"
        type="text"
        role="combobox"
        aria-expanded
        aria-controls="gp-list"
        aria-autocomplete="list"
        placeholder={`Search all ${groups.length} groups...`}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(0); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      <ul className="gp-list" id="gp-list" role="listbox" aria-label="Groups">
        {/* Pinned first: create a new group or artist. */}
        <li role="option" aria-selected={false}>
          <button type="button" className="gp-opt gp-opt-create gp-opt-newfirst" onClick={enterCreate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            <span className="gp-opt-name">New group or artist{q ? <>: <strong>{query.trim()}</strong></> : ''}</span>
          </button>
        </li>
        <li className="gp-count" aria-hidden="true">
          {q ? `${matches.length} match${matches.length === 1 ? '' : 'es'}` : `All ${groups.length} groups`}
        </li>
        {matches.map((g, i) => (
          <li key={g.slug} role="option" aria-selected={i === active}>
            <button
              type="button"
              className={`gp-opt${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => { onSelect(g.slug); setQuery(''); setActive(0); }}
            >
              <span className="gp-opt-dot" style={{ background: g.display_color }} aria-hidden="true" />
              <span className="gp-opt-name">{g.name}</span>
            </button>
          </li>
        ))}
        {q.length > 0 && matches.length === 0 && (
          <li className="gp-empty" aria-hidden="true">No existing group matches. Use New group or artist above.</li>
        )}
      </ul>
    </div>
  );
}
