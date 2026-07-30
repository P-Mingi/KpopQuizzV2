'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { renderTipTapJSON, splitTipTapForFold } from '@/lib/verse/render-content';

import type { EraTimelineItem } from '@/lib/verse/eras';

const SectionEditor = dynamic(() => import('./editor/section-editor').then((m) => m.SectionEditor), { ssr: false });

interface Props {
  eras: EraTimelineItem[];
  groupSlug: string;
  debut: { date: string; label: string } | null;
}

const YEAR = (d: string | null): string => (d ? d.slice(0, 4) : '');
function period(e: EraTimelineItem): string {
  const s = YEAR(e.periodStart);
  const end = YEAR(e.periodEnd);
  return end && end !== s ? `${s}–${end}` : s; // en dash for a true range; never an em dash
}

/**
 * W3K.2 - era-driven timeline. Newest era first (owner call); the debut anchors the
 * bottom. Each era is a chapter on a single spine: colour rail + node, period, albums,
 * and (when a curator has written one) the era story inline. Scaffolded eras with no
 * story show an honest invite, never fabricated prose. One can-edit fetch gates all
 * inline authoring; the story HTML is always in the DOM (crawlable), clamped when long.
 */
export function EraSpine({ eras, groupSlug, debut }: Props): React.ReactElement {
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [stories, setStories] = useState<Record<number, { html: string; content: unknown; rev: number | null }>>({});

  useEffect(() => {
    fetch(`/api/verse/can-edit?group=${encodeURIComponent(groupSlug)}`).then((r) => (r.ok ? r.json() : null)).then((d) => setCanEdit(!!d?.canEdit)).catch(() => {});
  }, [groupSlug]);

  const total = eras.length;

  return (
    <div>
      <p className="mb-5 text-xs text-tertiary">Grouped into eras from release dates. Era stories are written and credited by fans; auto-grouped eras are refined by curators.</p>

      <ol className="relative ml-2 border-l-2 pl-6" style={{ borderColor: 'var(--verse-line)' }}>
        {eras.map((e, i) => {
          const chapter = `E${String(total - i).padStart(2, '0')}`;
          const live = stories[e.id];
          const html = live?.html ?? e.storyHtml;
          const content = live ? live.content : e.storyContent;
          const rev = live ? live.rev : e.currentRevisionId;
          const hasStory = html.replace(/<[^>]*>/g, '').trim().length > 0;

          return (
            <li key={e.id} className="relative mb-6">
              <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full" style={{ background: e.color ?? 'var(--verse-accent)', border: '2px solid var(--verse-soft)' }} aria-hidden />
              <div className="rounded-r-xl border-l-[3px] pl-4" style={{ borderColor: e.color ?? 'var(--verse-accent)' }}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary tabular-nums">{chapter}</span>
                  <span className="text-xs font-semibold tabular-nums text-secondary">{period(e)}</span>
                  <h2 className="text-base font-bold" style={{ color: 'var(--verse-ink)' }}>{e.name}</h2>
                  {e.albums.length > 1 ? <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-secondary" style={{ background: 'var(--verse-soft)' }}>{e.albums.length} releases</span> : null}
                  {e.scaffolded && !hasStory ? <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }} title="Auto-grouped from release dates; no story written yet">auto</span> : null}
                </div>

                {e.concept ? <p className="mt-1 text-sm italic text-secondary">{e.concept}</p> : null}

                {e.albums.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.albums.map((a) => (
                      <a key={a.id} href={`/verse/${groupSlug}/albums/${a.slug}`} className="rounded-md px-2 py-1 text-xs text-secondary no-underline hover:text-primary" style={{ background: 'var(--verse-soft)' }}>
                        {a.title} <span className="text-tertiary">&middot; {a.type.toUpperCase()}</span>
                      </a>
                    ))}
                  </div>
                ) : null}

                {editing === e.id ? (
                  <div className="mt-3">
                    <SectionEditor
                      entityType="era" entityId={String(e.id)} section="era_story"
                      initialContent={content} baseRevisionId={rev} groupSlug={groupSlug}
                      onClose={() => setEditing(null)}
                      onSaved={(newRev, newContent) => {
                        setStories((s) => ({ ...s, [e.id]: { html: renderTipTapJSON(newContent), content: newContent, rev: newRev } }));
                        setEditing(null);
                      }}
                    />
                  </div>
                ) : hasStory ? (
                  <>
                    {/* V-TEXT fold: first block visible, the rest inside a native
                        <details> - full story in the served HTML, expands with JS off. */}
                    {(() => {
                      const split = splitTipTapForFold(content, 1);
                      if (!split.restHtml) return <div className="verse-prose mt-2 text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
                      return (
                        <div className="mt-2">
                          <div className="verse-prose text-sm" dangerouslySetInnerHTML={{ __html: split.previewHtml }} />
                          <details className="v-fold">
                            <summary><span className="v-fold-more">Read the era story</span><span className="v-fold-less">Show less</span></summary>
                            <div className="verse-prose text-sm" dangerouslySetInnerHTML={{ __html: split.restHtml }} />
                          </details>
                        </div>
                      );
                    })()}
                    {canEdit ? <button onClick={() => setEditing(e.id)} className="mt-1 text-xs text-tertiary hover:text-secondary">Edit</button> : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-tertiary">
                    No story yet.{' '}
                    {canEdit ? <button onClick={() => setEditing(e.id)} className="font-semibold no-underline" style={{ color: 'var(--verse-ink)' }}>Add this era&rsquo;s story</button> : <span>Fans can add one.</span>}
                  </p>
                )}
              </div>
            </li>
          );
        })}

        {debut ? (
          <li className="relative">
            <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full" style={{ background: 'var(--verse-soft-strong)', border: '2px solid var(--verse-line)' }} aria-hidden />
            <div className="flex flex-wrap items-baseline gap-2 pl-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">Debut</span>
              <span className="text-xs font-semibold tabular-nums text-secondary">{YEAR(debut.date)}</span>
              <span className="text-sm text-primary">{debut.label}</span>
            </div>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
