// V-FOUNDATION F4.4 - the home OVERVIEW section: the portal page's prose (pages.blocks)
// rendered inside the anti-overflow Fold. The content comes from the DB (Cowork authors
// it later); until then this renders nothing (min-gate), never invented filler.
import { createServiceRoleClient } from '@/lib/supabase/server';
import { runsPlain } from '@/lib/verse/tree/runs';

import { Fold } from './fold';

import type { DocBody, DocBlock } from '@/lib/verse/tree/blocks';

export async function VerseHomeOverview({ spaceId }: { spaceId: number }): Promise<React.ReactElement | null> {
  let blocks: DocBlock[] = [];
  try {
    const db = createServiceRoleClient();
    const { data } = await db.from('pages').select('blocks').eq('space_id', spaceId).eq('slug', 'home').maybeSingle();
    blocks = ((data?.blocks as DocBody | null)?.blocks ?? []);
  } catch { return null; }   // fail-closed: a read blip renders no overview, never 500s

  const nodes = blocks.map((b, i) => {
    if (b.type === 'paragraph') { const t = runsPlain(b.content); return t ? <p key={b.id || i}>{t}</p> : null; }
    if (b.type === 'heading') { const t = runsPlain(b.content); return t ? <h3 key={b.id || i}>{t}</h3> : null; }
    return null;
  }).filter(Boolean);
  if (!nodes.length) return null;   // no overview prose yet -> the section self-hides

  return (
    <section className="vh2-sec" style={{ paddingTop: 4 }}>
      <div className="vh2-sechead"><h2>Overview</h2></div>
      <Fold budgetPx={220}><div className="vh2-prose">{nodes}</div></Fold>
    </section>
  );
}
