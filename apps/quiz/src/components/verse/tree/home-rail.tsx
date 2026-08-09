// V-FOUNDATION F4.3 - the home v2 RIGHT DATA RAIL: the first real widgets. Clean
// server components reading the DB, counts via COUNT queries (the 1000-row law:
// never fetchAllRows for counting). Every value is real; a NULL/absent value renders
// nothing (honest emptiness), never invented. Reads are fail-closed (a throwing count
// degrades that widget to 0/hidden, never 500s the page).
import Link from 'next/link';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { buildGroupFactRail } from '@/lib/verse/tree/factrail';

import type { Space } from '@/lib/verse/space';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// count via a HEAD count query (1000-row law). The thunk returns the built query
// (a thenable); a throw degrades to 0 (fail-closed) so a blip never 500s the rail.
async function headCount(build: () => PromiseLike<{ count: number | null }>): Promise<number> {
  try { const { count } = await build(); return count ?? 0; } catch { return 0; }
}

interface NextBday { name: string; month: string; day: number; inDays: number }
function nextBirthday(idols: Space['idols'], now: Date): NextBday | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let best: { name: string; next: Date } | null = null;
  for (const i of idols) {
    const m = i.birth_date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) continue;
    let next = new Date(today.getFullYear(), Number(m[2]) - 1, Number(m[3]));
    if (next < today) next = new Date(today.getFullYear() + 1, Number(m[2]) - 1, Number(m[3]));
    if (!best || next < best.next) best = { name: i.name, next };
  }
  if (!best) return null;
  const inDays = Math.round((best.next.getTime() - today.getTime()) / 86400000);
  return { name: best.name, month: MONTHS[best.next.getMonth()]!, day: best.next.getDate(), inDays };
}

export async function VerseHomeRail({ space }: { space: Space }): Promise<React.ReactElement> {
  const db = createServiceRoleClient();
  const g = space.group;
  const now = new Date();
  const albumIds = space.albums.map((a) => a.id);

  const [eras, awards, tracks, pagesPub, nonStub, memberPages, releasePages, quizCount, quizRows, curators] = await Promise.all([
    headCount(() => db.from('eras').select('*', { count: 'exact', head: true }).eq('group_id', g.id)),
    headCount(() => db.from('awards').select('*', { count: 'exact', head: true }).eq('group_id', g.id)),
    albumIds.length ? headCount(() => db.from('album_tracks').select('*', { count: 'exact', head: true }).in('album_id', albumIds)) : Promise.resolve(0),
    headCount(() => db.from('pages').select('*', { count: 'exact', head: true }).eq('space_id', g.id).eq('status', 'published')),
    headCount(() => db.from('pages').select('*', { count: 'exact', head: true }).eq('space_id', g.id).eq('status', 'published').eq('is_stub', false)),
    headCount(() => db.from('pages').select('*', { count: 'exact', head: true }).eq('space_id', g.id).eq('entity_kind', 'idol').eq('status', 'published')),
    headCount(() => db.from('pages').select('*', { count: 'exact', head: true }).eq('space_id', g.id).eq('entity_kind', 'album').eq('status', 'published')),
    headCount(() => db.from('quizzes').select('*', { count: 'exact', head: true }).eq('group_id', g.id).eq('status', 'published')),
    db.from('quizzes').select('id, title').eq('group_id', g.id).eq('status', 'published').order('play_count', { ascending: false }).limit(3).then((r) => (r.data as { id: string; title: string }[] | null) ?? [], () => []),
    headCount(() => db.from('space_members').select('*', { count: 'exact', head: true }).eq('group_id', g.id).eq('role', 'curator').eq('status', 'active')),
  ]);

  const facts = buildGroupFactRail(g, space.counts.members, now)[0];
  const bday = nextBirthday(space.idols, now);
  const numbers = ([['Releases', space.counts.albums], ['Tracks', tracks], ['Eras', eras], ['Awards', awards]] as [string, number][]).filter(([, n]) => n > 0);
  const nonStubPct = pagesPub > 0 ? Math.round((nonStub / pagesPub) * 100) : 0;

  return (
    <>
      {/* F4.5 mobile order: the FIRST group (fact sheet + numbers) sits right after the
          head; the REST group falls below the document sections (CSS order on mobile). */}
      <div className="vh2-railgroup first">
      {/* FACT SHEET - the group infobox (A2 Data / Auto grammar) */}
      {facts ? (
        <aside className="vh2-widget" aria-label={`${g.name} fact sheet`}>
          <div className="vh2-whead"><h2>Fact sheet</h2><span className="vh2-badge data">Data</span></div>
          <div className="vh2-factphoto">group photo · moderated rail</div>
          <dl className="vh2-factrows">
            {facts.rows.map((r) => (
              <div className="vh2-frow" key={r.key}>
                <dt>{r.dt}</dt><dd>{r.dd}</dd>
                <span className={`vh2-badge ${r.auto ? 'auto' : 'data'}`}>{r.auto ? 'Auto' : 'Data'}</span>
              </div>
            ))}
          </dl>
          <p className="vh2-wsrc">Wikidata · MusicBrainz · CC0. Auto rows are computed from the database and cannot be edited.</p>
        </aside>
      ) : null}

      {/* IN NUMBERS - counted live */}
      {numbers.length ? (
        <aside className="vh2-widget" aria-label="Catalog in numbers">
          <div className="vh2-whead"><h2>In numbers</h2><span className="vh2-badge auto">Auto</span></div>
          <div className="vh2-numgrid">
            {numbers.map(([label, n]) => <div className="vh2-num" key={label}><b>{n}</b><span>{label}</span></div>)}
          </div>
          <p className="vh2-wsrc">Counted live from the KpopVerse database.</p>
        </aside>
      ) : null}
      </div>

      <div className="vh2-railgroup rest">
      {/* COMING UP - next member birthday from real birth dates */}
      {bday ? (
        <aside className="vh2-widget" aria-label="Coming up">
          <div className="vh2-whead"><h2>Coming up</h2><span className="vh2-badge auto">Auto</span></div>
          <div className="vh2-upcoming">
            <div className="vh2-cal" aria-hidden="true"><div className="m">{bday.month}</div><div className="d">{bday.day}</div></div>
            <div className="vh2-what"><b>{bday.name}&apos;s birthday</b><span>{bday.inDays === 0 ? 'today' : `in ${bday.inDays} day${bday.inDays === 1 ? '' : 's'}`}</span></div>
          </div>
          <p className="vh2-wsrc">Computed from member birth dates in the database.</p>
        </aside>
      ) : null}

      {/* THIS SPACE - coverage */}
      {pagesPub > 0 ? (
        <aside className="vh2-widget" aria-label="Space coverage">
          <div className="vh2-whead"><h2>This space</h2><span className="vh2-badge auto">Auto</span></div>
          <div className="vh2-covrows">
            <div className="vh2-covrow"><div className="lbl"><span>Pages</span><b>{pagesPub}</b></div><div className="vh2-covbar"><i style={{ width: '100%' }} /></div></div>
            <Coverage label="Members covered" have={memberPages} total={space.counts.members} />
            <Coverage label="Releases covered" have={releasePages} total={space.counts.albums} />
            <div className="vh2-covrow"><div className="lbl"><span>Filled in</span><b>{nonStubPct}%</b></div><div className="vh2-covbar"><i style={{ width: `${Math.max(nonStubPct, 2)}%` }} /></div></div>
          </div>
          <p className="vh2-wsrc">Every entity has a page. Most are honest stubs: facts first, prose being written.</p>
        </aside>
      ) : null}

      {/* PLAY - real published quizzes */}
      {quizCount > 0 ? (
        <aside className="vh2-widget" aria-label={`${g.name} quizzes`}>
          <div className="vh2-whead"><h2>Play</h2><span className="vh2-badge data">Data</span></div>
          <div className="vh2-quizrow">
            {quizRows.map((qz) => <Link key={qz.id} href={`/quiz/${qz.id}`}>{qz.title}<span className="arr" aria-hidden="true">-&gt;</span></Link>)}
          </div>
          <p className="vh2-wsrc">{quizCount} published {g.name} quiz{quizCount === 1 ? '' : 'zes'} on the Play side.</p>
        </aside>
      ) : null}

      {/* CURATORS - real membership */}
      {curators > 0 ? (
        <aside className="vh2-widget" aria-label="Curators">
          <div className="vh2-whead"><h2>Curators</h2></div>
          <div className="vh2-curators">
            <div className="avs">{Array.from({ length: Math.min(curators, 4) }, (_, i) => <span className="av" key={i} aria-hidden="true">{String.fromCharCode(65 + i)}</span>)}</div>
            <p><b>{curators} curator{curators === 1 ? '' : 's'}</b> tend{curators === 1 ? 's' : ''} this space. Creation opens to the community once the skeleton is validated.</p>
          </div>
        </aside>
      ) : null}
      </div>
    </>
  );
}

function Coverage({ label, have, total }: { label: string; have: number; total: number }): React.ReactElement {
  const pct = total > 0 ? Math.round((have / total) * 100) : 0;
  return (
    <div className="vh2-covrow">
      <div className="lbl"><span>{label}</span><b>{have} / {total}</b></div>
      <div className="vh2-covbar"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>
    </div>
  );
}
