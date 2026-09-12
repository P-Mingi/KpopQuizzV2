import { getGroupBySlug } from '@/lib/db/queries/groups';
import { getBankItems } from '@/lib/tier-list/bank';
import { SUBJECT_KIND_LABEL, parseKind } from '@/lib/tier-list/subject';
import { decodeBoard } from '@/lib/tier-list/share-state';
import { TierMaker } from '@/components/tier-list/tier-maker';

import type { Metadata } from 'next';
import type { TierListItem } from '@/lib/tier-list/types';

// The maker is a tool, not an indexed page: noindex, and the canonical entry is
// the Hub. It reads the subject from the URL (group slug + what-to-rank) and loads
// the bank items server-side, or starts blank. All ranking is client-side (no DB).
export const metadata: Metadata = {
  title: 'Make a tier list',
  robots: { index: false, follow: true },
};

interface Props { searchParams: Promise<{ group?: string; kind?: string; d?: string }> }

export default async function NewTierListPage({ searchParams }: Props): Promise<React.ReactElement> {
  const sp = await searchParams;
  const kind = parseKind(sp.kind);
  let items: TierListItem[] = [];
  let title = 'My tier list';
  let boardId = 'blank';

  // Challenge / shared item set: reopen the same items on an empty board.
  if (sp.d) {
    const board = decodeBoard(sp.d);
    if (board && board.items.length > 0) {
      items = board.items;
      title = `${board.title} (your turn)`;
      boardId = `challenge-${sp.d.slice(0, 12)}`;
    }
  } else if (sp.group && kind !== 'blank') {
    const group = await getGroupBySlug(sp.group);
    if (group) {
      items = await getBankItems(group.id, kind);
      title = `${group.name} ${SUBJECT_KIND_LABEL[kind]}`;
      boardId = `${group.slug}-${kind}`;
    }
  }

  return (
    <div className="tl tl-wrap">
      <div className="tl-kick" style={{ marginBottom: 2 }}>KpopQuiz Tier Lists</div>
      <h1 className="tl-d2" data-testid="maker-title">{title}</h1>
      <p className="tl-mut" style={{ marginBottom: 18 }}>
        {items.length > 0 ? `${items.length} items loaded.` : 'Blank board. Add your own items, or start from a subject on the hub.'}
      </p>
      <TierMaker items={items} boardId={boardId} title={title} />
    </div>
  );
}
