'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import { visibleGroups } from '@/lib/ux-v1/p5/view';

import type { FunnelGroup } from '@/lib/ux-v1/p5/funnel';

// The group field of step 1 (prototype #create: a search box with the chosen group
// as a chip). Same behaviour as the EXISTS components/create/group-picker.tsx: every
// group of the database is reachable (type to filter by name, arrow keys + Enter),
// "New group or artist" is pinned first and opens a name field that goes to the
// existing custom-group path at publish (group_name, 2+ characters, 60 max).
// ARIA 1.2 combobox: the input owns a listbox through aria-activedescendant.

interface Props {
  groups: FunnelGroup[];
  selectedSlug: string | null;
  customGroup: string | null;
  onSelect: (slug: string) => void;
  onCreate: (name: string) => void;
  onClear: () => void;
  invalid: boolean;
  describedBy: string;
}

const NEW_ID = '__new__';

function Initials({ name }: { name: string }): React.ReactElement {
  const t = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || name.slice(0, 1);
  return <span aria-hidden="true">{t}</span>;
}

export function GroupAvatar({ slug, name }: { slug: string | null; name: string }): React.ReactElement {
  const photo = groupPhotoUrl(slug);
  return (
    <span className="ux-gav p5-gav" style={photo ? { backgroundImage: `url("${photo}")` } : undefined} aria-hidden="true">
      {photo ? null : <Initials name={name} />}
    </span>
  );
}

export function GroupField({ groups: allGroups, selectedSlug, customGroup, onSelect, onCreate, onClear, invalid, describedBy }: Props): React.ReactElement {
  const groups = useMemo(() => visibleGroups(allGroups), [allGroups]);
  const uid = useId().replace(/:/g, '');
  const listId = `p5-glist-${uid}`;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = selectedSlug ? allGroups.find((g) => g.slug === selectedSlug) ?? null : null;
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups), [groups, q]);
  // Option list: "New group or artist" first, then the groups (legacy order).
  const optionIds = useMemo(() => [NEW_ID, ...matches.map((g) => g.slug)], [matches]);
  const activeId = open ? optionIds[active] : undefined;

  // Close the list on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open || !activeId) return;
    document.getElementById(`${listId}-${activeId}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeId, listId]);

  const pick = (slug: string): void => {
    onSelect(slug);
    setQuery('');
    setActive(1);
    setOpen(false);
  };

  const startCreate = (): void => {
    setNewName(query.trim());
    setCreating(true);
    setOpen(false);
    window.requestAnimationFrame(() => newRef.current?.focus());
  };

  const submitCreate = (): void => {
    const name = newName.trim();
    if (name.length < 2) return;
    onCreate(name);
    setCreating(false);
    setNewName('');
    setQuery('');
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(matches.length ? 1 : 0); return; }
      setActive((i) => Math.min(i + 1, optionIds.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (!open && !q) return;
      e.preventDefault();
      const id = open ? optionIds[active] : undefined;
      if (id && id !== NEW_ID) pick(id);
      else if (id === NEW_ID) startCreate();
      else if (matches.length > 0) pick(matches[0]!.slug);
      else if (query.trim().length >= 2) startCreate();
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    } else if (e.key === 'Backspace' && !query && (selected || customGroup)) {
      onClear();
    }
  };

  if (creating) {
    return (
      <div className="p5-gcreate">
        <label className="p5-gcreate-l" htmlFor={`p5-gnew-${uid}`}>New group or artist</label>
        <input
          id={`p5-gnew-${uid}`}
          ref={newRef}
          className="ux-inp"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submitCreate(); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCreating(false); window.requestAnimationFrame(() => inputRef.current?.focus()); }
          }}
          placeholder="e.g. Cortis"
          maxLength={60}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="p5-gcreate-a">
          <button type="button" className="ux-btn ux-btn-quiet" onClick={() => { setCreating(false); window.requestAnimationFrame(() => inputRef.current?.focus()); }}>Cancel</button>
          <button type="button" className="ux-btn ux-btn-ghost" disabled={newName.trim().length < 2} onClick={submitCreate}>Create group</button>
        </div>
      </div>
    );
  }

  const chipName = selected?.name ?? customGroup;

  return (
    <div className="p5-gwrap" ref={wrapRef}>
      <div className={`ux-inp p5-gbox${invalid ? ' is-err' : ''}`} onClick={() => inputRef.current?.focus()}>
        <Icon name="search" className="p5-gbox-i" />
        {chipName ? (
          <span className="p5-gchip">
            <GroupAvatar slug={selected?.slug ?? null} name={chipName} />
            <span className="p5-gchip-t">{chipName}</span>
            {customGroup && !selected ? <span className="p5-gchip-new">new group</span> : null}
            <button type="button" className="p5-gchip-x" aria-label={`Remove ${chipName}`} onClick={(e) => { e.stopPropagation(); onClear(); inputRef.current?.focus(); }}>
              <Icon name="x" />
            </button>
          </span>
        ) : null}
        <input
          ref={inputRef}
          id="p5-group-q"
          className="p5-gbox-in"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId ? `${listId}-${activeId}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={chipName ? 'Search another group' : `Search ${groups.length} groups`}
          value={query}
          onChange={(e) => {
            const nq = e.target.value.trim().toLowerCase();
            setQuery(e.target.value);
            setOpen(true);
            setActive((nq ? groups.some((g) => g.name.toLowerCase().includes(nq)) : groups.length > 0) ? 1 : 0);
          }}
          onFocus={() => { if (query) setOpen(true); }}
          onClick={() => { setOpen(true); setActive(matches.length ? 1 : 0); }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <ul className="ux-pop p5-glist" id={listId} role="listbox" aria-label="Groups" hidden={!open}>
        <li id={`${listId}-${NEW_ID}`} role="option" aria-selected={activeId === NEW_ID} className="ux-mi p5-gopt p5-gopt-new" onPointerDown={(e) => e.preventDefault()} onClick={startCreate}>
          <Icon name="plus" />
          <span>New group or artist{q ? <>: <b>{query.trim()}</b></> : null}</span>
        </li>
        <li className="p5-gcount" role="presentation">{q ? `${matches.length} match${matches.length === 1 ? '' : 'es'}` : `All ${groups.length} groups`}</li>
        {matches.map((g, i) => (
          <li
            key={g.slug}
            id={`${listId}-${g.slug}`}
            role="option"
            aria-selected={activeId === g.slug}
            className="ux-mi p5-gopt"
            onPointerDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i + 1)}
            onClick={() => pick(g.slug)}
          >
            <GroupAvatar slug={g.slug} name={g.name} />
            <span>{g.name}</span>
            {g.slug === selectedSlug ? <Icon name="check" className="p5-gopt-on" /> : null}
          </li>
        ))}
        {q && matches.length === 0 ? <li className="p5-gcount" role="presentation">No group matches. Use New group or artist above.</li> : null}
      </ul>
    </div>
  );
}
