// V-FOUNDATION F1 Phase E - the reader's curated space menu (locked prototype screen 03).
// The fandom-proven 5x3x10 shape replaces the flat tab bar. SEO-clean: the WHOLE tree is
// real nested <a href> in the served HTML (reading order = DOM); the flyouts are pure CSS
// (hover + focus-within), so every link is crawlable and keyboard-reachable with JS off.
import Link from 'next/link';

import type { NavNode, NavRef } from '@/lib/verse/tree/nav';

function hrefFor(spaceSlug: string, ref: NavRef | undefined): string | null {
  if (!ref) return null;
  if (ref.kind === 'page') return `/verse/${spaceSlug}/${ref.slug}`;
  return null; // an auto-index target renders as a label until its index route lands (F1 flag)
}

function NodeLabel({ spaceSlug, node, caret }: { spaceSlug: string; node: NavNode; caret: boolean }): React.ReactElement {
  const href = hrefFor(spaceSlug, node.ref);
  const label = <>{node.label}{caret ? <span className="vnav-caret" aria-hidden="true"> &#9662;</span> : null}</>;
  return href ? <Link href={href}>{label}</Link> : <span className="vnav-parent" tabIndex={0}>{label}</span>;
}

function SubTree({ spaceSlug, nodes }: { spaceSlug: string; nodes: NavNode[] }): React.ReactElement {
  return (
    <ul className="vnav-sub">
      {nodes.map((n, i) => (
        <li key={i}>
          <NodeLabel spaceSlug={spaceSlug} node={n} caret={false} />
          {n.children && n.children.length > 0 ? <SubTree spaceSlug={spaceSlug} nodes={n.children} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function ReaderMenu({ spaceSlug, tree, spaceName }: { spaceSlug: string; tree: NavNode[]; spaceName: string }): React.ReactElement {
  return (
    <nav className="vnav" aria-label={`${spaceName} menu`}>
      <ul className="vnav-top">
        {tree.map((n, i) => {
          const hasKids = !!(n.children && n.children.length > 0);
          return (
            <li key={i} className={hasKids ? 'has-sub' : undefined}>
              <NodeLabel spaceSlug={spaceSlug} node={n} caret={hasKids} />
              {hasKids ? <SubTree spaceSlug={spaceSlug} nodes={n.children!} /> : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
