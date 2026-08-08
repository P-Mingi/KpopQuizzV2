// V-FOUNDATION F1 Phase C - the DOCUMENT canvas (locked prototype screen 01). A reading-
// first, three-column reference page: auto-TOC left, 66ch prose center, grouped fact rail
// right, with a document foot (tags, auto-navbox, backlinks). One H1 (the page title);
// reading order = DOM order. All block text is escaped at the render sink (React), never
// dangerouslySetInnerHTML (XSS law). Min-gated: absent sections simply do not render.
import Link from 'next/link';

import { DocToc } from './doc-toc';
import { extractToc, headingAnchors } from '@/lib/verse/tree/toc';
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
}

function fmt(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 'recently';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export function DocumentPage(props: DocumentPageProps): React.ReactElement {
  const { page, crumbs, facts, navbox, tags, backlinks, revisionCount, updatedAt, hangul } = props;
  const blocks = page.blocks?.blocks ?? [];
  const anchors = headingAnchors(page.blocks);
  const toc = extractToc(page.blocks);
  const indexable = page.status === 'published' && !page.is_stub;

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
          <span className={indexable ? 'vdoc-chip data' : 'vdoc-chip'}>{indexable ? 'indexable' : 'draft'}</span>
        </div>

        {blocks.map((b, i) => <BodyBlock key={b.id ?? i} block={b} anchor={anchors.get(b)} lead={i === firstTextIndex(blocks)} />)}

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
  return blocks.findIndex((b) => b.type === 'text');
}

// One body block -> its element. Text is escaped by React (never innerHTML). Unknown
// block types are skipped (forward-compatible: a new block type never breaks an old page).
function BodyBlock({ block, anchor, lead }: { block: PageBlock; anchor?: string | undefined; lead: boolean }): React.ReactElement | null {
  const text = typeof block.text === 'string' ? block.text : '';
  switch (block.type) {
    case 'heading': {
      const level = block.level === 3 ? 3 : 2;
      if (level === 3) return <h3>{text}</h3>;
      return <h2 id={anchor}>{text}<a className="anchor" href={`#${anchor}`} aria-hidden="true" tabIndex={-1}>#</a></h2>;
    }
    case 'text': {
      const body = typeof block.html === 'string' ? block.html : text;
      if (!body.trim()) return null;
      return <p className={lead ? 'lead' : undefined}>{body}</p>;
    }
    case 'quote':
      if (!text.trim()) return null;
      return <blockquote>{text}{typeof block.cite === 'string' && block.cite ? <cite>{block.cite}</cite> : null}</blockquote>;
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
    default:
      return null;   // image/gallery/embed land with their renderers in a later wave (min-gate)
  }
}
