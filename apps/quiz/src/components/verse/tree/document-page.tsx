// V-FOUNDATION F1 Phase C - the DOCUMENT canvas (locked prototype screen 01). A reading-
// first, three-column reference page: auto-TOC left, 66ch prose center, grouped fact rail
// right, with a document foot (tags, auto-navbox, backlinks). One H1 (the page title);
// reading order = DOM order. All block text is escaped at the render sink (React), never
// dangerouslySetInnerHTML (XSS law). Min-gated: absent sections simply do not render.
import Link from 'next/link';

import { DocToc } from './doc-toc';
import { extractToc, headingAnchors } from '@/lib/verse/tree/toc';
import { templateSections } from '@/lib/verse/tree/templates';
import type { PageRow, PageBlock } from '@/lib/verse/tree/types';
import type { FactSection } from '@/lib/verse/tree/factrail';

export interface Crumb { label: string; href?: string }
export interface NavboxItem { label: string; href: string; current?: boolean }

export interface DocumentPageProps {
  spaceSlug: string;
  page: PageRow;
  hangul?: string | null;               // member pages carry a hangul name beside the title
  crumbs: Crumb[];                       // space -> ancestors (current title appended here)
  facts: FactSection[] | null;
  navbox?: { heading: string; items: NavboxItem[] } | null;   // auto from DB relations
  tags?: { key: string; label: string }[];
  backlinks?: { count: number; sample: { slug: string; title: string }[] };
  revisionCount: number;
  updatedAt: string;
  existingSlugs?: string[];   // link targets that already exist (else the link is a ghost, C6)
}

function fmt(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 'recently';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export function DocumentPage(props: DocumentPageProps): React.ReactElement {
  const { page, crumbs, facts, navbox, tags, backlinks, revisionCount, updatedAt, hangul, spaceSlug } = props;
  const blocks = page.blocks?.blocks ?? [];
  const anchors = headingAnchors(page.blocks);
  const toc = extractToc(page.blocks);
  const indexable = page.status === 'published' && !page.is_stub;
  const existing = new Set(props.existingSlugs ?? []);
  const sectionHints = page.is_stub ? templateSections(page.type) : [];

  return (
    <div className="vdoc">
      <DocToc items={toc} />

      <main className="vdoc-main">
        <nav className="vdoc-crumb" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 ? <span className="sep">/</span> : null}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>

        {/* the page's ONE h1 */}
        <h1 className="vdoc-title">{page.title}{hangul ? <span className="hangul">{hangul}</span> : null}</h1>

        <div className="vdoc-editline">
          <span>{revisionCount} revision{revisionCount === 1 ? '' : 's'}</span>
          <span>updated {fmt(updatedAt)}</span>
          <span className={indexable ? 'vdoc-chip data' : 'vdoc-chip'}>{indexable ? 'indexable' : page.status === 'published' ? 'noindex' : 'draft'}</span>
          <span className="vdoc-chip">{(backlinks?.count ?? 0)} inbound link{(backlinks?.count ?? 0) === 1 ? '' : 's'}</span>
        </div>

        {/* Honest stub state (C5/C6, prototype note 6): the page says what it is missing
            instead of faking substance. It stays noindex until real content or a binding. */}
        {page.is_stub ? (
          <div className="vdoc-stub" role="note">
            <p><strong>This page is an honest shell</strong> - nothing invented, nothing generated. It stays invisible to search until it has real content or a data binding.</p>
            {sectionHints.length > 0 ? (
              <p>The {page.type} template offers its sections: {sectionHints.map((s, i) => <span key={s}>{i > 0 ? ' · ' : ''}{s}</span>)}.</p>
            ) : null}
          </div>
        ) : null}

        {blocks.map((b, i) => <BodyBlock key={b.id ?? i} block={b} anchor={anchors.get(b)} lead={i === firstTextIndex(blocks)} spaceSlug={spaceSlug} existing={existing} />)}

        {(tags?.length || navbox?.items.length || (backlinks && backlinks.count > 0)) ? (
          <div className="vdoc-foot">
            {tags && tags.length > 0 ? (
              <>
                <div className="h">Tags</div>
                <p style={{ margin: '0 0 4px' }}>
                  {tags.map((t) => <Link key={t.key} className="vdoc-chip" href={`/verse/${props.spaceSlug}/tag/${t.key}`}>{t.label}</Link>)}
                </p>
              </>
            ) : null}
            {navbox && navbox.items.length > 0 ? (
              <>
                <div className="h">{navbox.heading}</div>
                <div className="vdoc-navbox">
                  <b>auto</b>
                  {navbox.items.map((it) => it.current
                    ? <strong key={it.href}>{it.label}</strong>
                    : <Link key={it.href} href={it.href}>{it.label}</Link>)}
                </div>
              </>
            ) : null}
            {backlinks && backlinks.count > 0 ? (
              <>
                <div className="h">What links here</div>
                <p className="vdoc-backlinks">
                  {backlinks.count} page{backlinks.count === 1 ? '' : 's'}
                  {backlinks.sample.length ? <> · {backlinks.sample.map((s, i) => (
                    <span key={s.slug}>{i > 0 ? ', ' : ' '}<Link href={`/verse/${props.spaceSlug}/${s.slug}`}>{s.title}</Link></span>
                  ))}</> : null}
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </main>

      {facts && facts.length > 0 ? (
        <aside className="vdoc-rail" aria-label="Facts">
          <div className="vdoc-infobox">
            {facts.map((s) => (
              <section key={s.heading}>
                <h4>{s.heading}</h4>
                <dl>
                  {s.rows.map((r) => (
                    <div key={r.dt} style={{ display: 'contents' }}>
                      <dt>{r.dt}</dt>
                      <dd>{r.dd}{r.auto ? <span className="auto">auto</span> : null}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <p className="vdoc-railnote">Every fact carries its source. Auto = derived from the data, never hand-copied.</p>
        </aside>
      ) : null}
    </div>
  );
}

function firstTextIndex(blocks: PageBlock[]): number {
  return blocks.findIndex((b) => b.type === 'paragraph' || b.type === 'text');
}

// One body block -> its element. Text is escaped by React (never innerHTML). Unknown
// block types are skipped (forward-compatible: a new block type never breaks an old page).
interface Run { text: string; marks?: string[]; link?: { toSlug?: string; href?: string } }
function blockRuns(block: PageBlock): Run[] {
  if (Array.isArray(block.content)) return block.content as Run[];
  if (typeof block.text === 'string' && block.text.trim()) return [{ text: block.text }];
  return [];
}
// Render one inline run: React escapes the TEXT; marks + link wrap it in a FIXED set of tags.
// There is no HTML string anywhere, so this is XSS-safe by construction (the sink law).
function RunSpan({ run, spaceSlug, existing }: { run: Run; spaceSlug: string; existing: Set<string> }): React.ReactElement {
  let node: React.ReactNode = run.text;
  const m = run.marks ?? [];
  if (m.includes('mark')) node = <mark>{node}</mark>;
  if (m.includes('u')) node = <u>{node}</u>;
  if (m.includes('i')) node = <em>{node}</em>;
  if (m.includes('b')) node = <strong>{node}</strong>;
  if (run.link?.toSlug) {
    node = existing.has(run.link.toSlug)
      ? <Link href={`/verse/${spaceSlug}/${run.link.toSlug}`}>{node}</Link>
      : <Link className="vdoc-ghost" href={`/verse/${spaceSlug}/new?slug=${encodeURIComponent(run.link.toSlug)}`}>{node}</Link>;
  } else if (run.link?.href) {
    const ext = !run.link.href.startsWith('/');
    node = <a href={run.link.href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}>{node}</a>;
  }
  return <>{node}</>;
}
function Runs({ runs, spaceSlug, existing }: { runs: Run[]; spaceSlug: string; existing: Set<string> }): React.ReactElement {
  return <>{runs.map((r, i) => <RunSpan key={i} run={r} spaceSlug={spaceSlug} existing={existing} />)}</>;
}

function BodyBlock({ block, anchor, lead, spaceSlug, existing }: { block: PageBlock; anchor?: string | undefined; lead: boolean; spaceSlug: string; existing: Set<string> }): React.ReactElement | null {
  const runs = blockRuns(block);
  const R = <Runs runs={runs} spaceSlug={spaceSlug} existing={existing} />;
  switch (block.type) {
    case 'heading': {
      const level = block.level === 3 ? 3 : 2;
      if (!runs.length) return null;
      if (level === 3) return <h3>{R}</h3>;
      return <h2 id={anchor}>{R}<a className="anchor" href={`#${anchor}`} aria-hidden="true" tabIndex={-1}>#</a></h2>;
    }
    case 'paragraph':
    case 'text':
      return runs.length ? <p className={lead ? 'lead' : undefined}>{R}</p> : null;
    case 'quote':
      return runs.length ? <blockquote>{R}{typeof block.cite === 'string' && block.cite ? <cite>{block.cite}</cite> : null}</blockquote> : null;
    case 'callout':
      return runs.length ? <div className="vdoc-callout"><span className="ic" aria-hidden="true">{typeof block.icon === 'string' ? block.icon : '\u{1F4A1}'}</span><div>{R}</div></div> : null;
    case 'list': {
      const items = Array.isArray(block.items) ? (block.items as Run[][]) : [];
      return items.length ? <ul className="vdoc-list">{items.map((it, i) => <li key={i}><Runs runs={it} spaceSlug={spaceSlug} existing={existing} /></li>)}</ul> : null;
    }
    case 'divider':
      return <hr className="vdoc-hr" />;
    case 'image': {
      const path = typeof block.path === 'string' ? block.path : '';
      if (!path) return null;
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/verse-space-assets/${path.replace(/^\/+/, '')}`;
      return (
        <figure className="vdoc-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={typeof block.alt === 'string' ? block.alt : ''} onError={undefined} />
          {typeof block.caption === 'string' && block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case 'table': {
      const rows = Array.isArray(block.rows) ? (block.rows as string[][]) : [];
      if (rows.length === 0) return null;
      const [head, ...body] = rows;
      return (
        <table className="vdoc-table">
          {head ? <thead><tr>{head.map((c, i) => <th key={i}>{c}</th>)}</tr></thead> : null}
          <tbody>{body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      );
    }
    case 'link': {
      // C6 block-level page link: solid if the target exists, dashed ghost -> create if not.
      const toSlug = typeof block.to_slug === 'string' ? block.to_slug : '';
      const label = typeof block.label === 'string' && block.label.trim() ? block.label : toSlug;
      if (!toSlug) return null;
      if (existing.has(toSlug)) return <p><Link href={`/verse/${spaceSlug}/${toSlug}`}>{label}</Link></p>;
      return <p><Link className="vdoc-ghost" href={`/verse/${spaceSlug}/new?slug=${encodeURIComponent(toSlug)}&title=${encodeURIComponent(label)}`}>{label} <span aria-hidden="true">+ create</span></Link></p>;
    }
    default:
      return null;   // locked widgets never reach here (clamp drops them); min-gate
  }
}
