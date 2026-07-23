'use client';

import { useMemo, useRef, useState } from 'react';

import type { FunnelGroup } from './create-funnel';

// Q-B1: searchable group picker. Replaces the full chip wall of every group
// (87 on prod) with a search-first combobox: type to filter, arrow keys +
// Enter to pick, and an explicit "add a new group" row that routes to the
// EXISTING custom-group API path (create/route.ts resolves group_name -> a new
// is_custom group). The list is rendered lazily (capped), so we never paint all
// 87 rows at once even though the full set is already in memory.

const MAX_VISIBLE = 8; // lazy render cap - never more than this at once

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
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedGroup = selectedSlug ? groups.find((g) => g.slug === selectedSlug) ?? null : null;
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    const list = q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
    return list.slice(0, MAX_VISIBLE);
  }, [groups, q]);

  // Offer "create" only when the query does not exactly match an existing group.
  const exactExists = q.length > 0 && groups.some((g) => g.name.toLowerCase() === q);
  const canCreate = query.trim().length >= 2 && !exactExists;
  const rowCount = matches.length + (canCreate ? 1 : 0);

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

  const commit = (index: number): void => {
    if (index < matches.length) {
      onSelect(matches[index]!.slug);
    } else if (canCreate) {
      onCreateCustom(query.trim());
    }
    setQuery('');
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rowCount - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (rowCount > 0) commit(active); }
  };

  return (
    <div className="gp-wrap">
      <input
        ref={inputRef}
        className="cf-input gp-input"
        type="text"
        role="combobox"
        aria-expanded={rowCount > 0}
        aria-controls="gp-list"
        aria-autocomplete="list"
        placeholder="Search groups (BTS, aespa, Stray Kids...)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(0); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      {rowCount > 0 && (
        <ul className="gp-list" id="gp-list" role="listbox" aria-label="Groups">
          {matches.map((g, i) => (
            <li key={g.slug} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`gp-opt${i === active ? ' active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
              >
                <span className="gp-opt-dot" style={{ background: g.display_color }} aria-hidden="true" />
                <span className="gp-opt-name">{g.name}</span>
              </button>
            </li>
          ))}
          {canCreate && (
            <li role="option" aria-selected={active === matches.length}>
              <button
                type="button"
                className={`gp-opt gp-opt-create${active === matches.length ? ' active' : ''}`}
                onMouseEnter={() => setActive(matches.length)}
                onClick={() => commit(matches.length)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                <span className="gp-opt-name">Add <strong>{query.trim()}</strong> as a new group</span>
              </button>
            </li>
          )}
        </ul>
      )}
      {q.length > 0 && rowCount === 0 && (
        <p className="cf-mini-hint" style={{ textAlign: 'left', marginTop: 8 }}>No groups match. Type at least 2 characters to add a new one.</p>
      )}
    </div>
  );
}
