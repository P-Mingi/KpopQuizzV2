import { buildAnswerFirst, buildAnswerChunks } from '@/lib/seo/answer-first';

import type { GroupFacts } from '@/lib/seo/answer-first';
import type { Group } from '@/lib/db/types';

// W8 - the answer-first block plus the query fan-out, rendered as crawlable HTML.
//
// The headings are the literal questions a fan types ("How many members does TWICE
// have?", not "Members"), because that is what an assistant matches against. Each
// answer sits directly under its own heading and repeats the group name, so a chunk
// lifted on its own still says what it is about.
//
// MIN-GATE: a group with no facts renders nothing at all. No empty headings, no
// placeholder rows, no gap where a sentence would have been.
export function AnswerFirst({
  group,
  facts,
  seoIntro,
}: {
  group: Group;
  facts: GroupFacts;
  /** W2 PART D: the curator's intro is additive ON PAGE and stays OUT of the meta description. */
  seoIntro?: string | null;
}): React.ReactElement | null {
  const answer = buildAnswerFirst(group, facts);
  const chunks = buildAnswerChunks(group, facts);

  // MIN-GATE, tightened after seeing it live: with no chunks the lead degrades to
  // "X is a K-pop group. On kpopquiz.org you can play N quizzes", which answers no
  // question and repeats the intro paragraph already on the page. A block that adds
  // nothing is worse than no block, so the whole section is withheld unless at least
  // one real fact exists. Cortis (no members, no debut, placeholder fandom) renders
  // nothing at all rather than a 15-word non-answer.
  if (chunks.length === 0) return null;

  return (
    <section className="af" aria-label={`About ${group.name}`}>
      {answer && <p className="af-lead">{answer}</p>}

      {seoIntro && <p className="af-intro">{seoIntro}</p>}

      {/* The Q&A stays real headings and real paragraphs, because that crawlable shape
          is the whole point of the block. Only the presentation changed: a card grid
          instead of an undifferentiated run of text, so a reader can scan for the one
          fact they came for. */}
      <div className="af-grid">
        {chunks.map((c) => (
          <div className="af-item" key={c.question}>
            <h2 className="af-q">{c.question}</h2>
            <p className="af-a">{c.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
