# KPOP-SOURCES: where K-pop facts come from

Version 2, 2026-10-14 (SEO Mission 1; rulebook `.claude/skills/kpopquiz-seo/SKILL.md`, section 5).
Every K-pop claim on an indexable page (members, debut date, label, fandom name, generation,
discography, records) traces to one of the sources below, and the source link sits next to the
fact on the page. This replaces version 1, which put kprofiles and the Fandom wiki first.

**Golden rule:** two agreeing sources, one of them official, Wikidata or Wikipedia, or it does not
go in as a fact. If sources conflict or are thin (very new groups), write a vaguer sentence that is
true ("a 2024 debut") instead of a number, a roster or a label. A vaguer true sentence always beats
a precise wrong one.

## Level A: the sources a fact can rest on
- **Official sites and verified accounts**: the group's official site, its label's artist page
  (HYBE, SM, YG, JYP, Starship, Pledis and the rest), and the group's or label's verified accounts
  (X, Instagram, Weverse, YouTube). The primary source for the current lineup, the debut date, the
  official romanization and the fandom name. On conflict, official wins.
- **Wikidata**: the structured record (members, inception, record label, genre) and the stable ID
  used in our JSON-LD `sameAs`. Fetch IDs by script, never type a QID.
- **MusicBrainz**: releases, release dates, track lists, artist relationships.
- **Wikipedia**: the narrative record with its own citations; check the cited source when a fact is
  load-bearing.

## Charts and records
- **Circle Chart** (circlechart.kr, formerly Gaon): what charts in Korea, certifications.
- **Billboard** (billboard.com): Global and US charts.
- Records and "firsts" need one of these two or a level A source. Streaming counts move every day:
  never print one as a lasting fact.

## Leads, never a source on their own
- **Soompi, allkpop** and similar news sites: good for spotting a comeback, a debut or a lineup
  change. Confirm in a level A source before writing it as a fact.
- **Bylined reputable outlets** (Korea JoongAng Daily, Korea Times, Korea Herald, Yonhap, Billboard,
  NME): may be cited for a dated event, and to attribute a debate ("commonly described as 5th
  generation (Korea Times, 2025)").

## Not sources: never extracted, copied or cited
- **kprofiles** and **Fandom wikis** (kpop.fandom.com and the rest), and any similar fan database.
  They are fan-edited and their content is theirs. Citation over extraction: we never scrape them,
  copy them or link them as a source.
- Facts drawn from user-made quizzes (fun facts) are review candidates, never facts on their own.

## Generation labels
Generation labels come from the group data, with a confidence level, and every page reads the same
field, so the site never contradicts itself:
- **consensus**: the generation is not disputed; show the number ("3rd generation").
- **attributed**: a named reliable source says it; write "commonly described as 5th generation
  (Korea Times, 2025)" with the link.
- **contested** or **newest**: say so, show both views, or write "newest wave".

## Fact-check rules (every page, every article)
1. **Members and roster**: level A, two agreeing sources. Never invent or omit a member. If unsure of
   the exact count, write "the group", not "the N members".
2. **Debut date**: level A plus a second source. Give the year unless two sources agree on the day.
3. **Generation**: the confidence rule above, from the group data.
4. **Songs and counts**: only a title you can source; never a made-up tracklist. Our own counts
   (quizzes, songs in the blind test, plays) come only from the site stats function
   (`apps/quiz/src/lib/stats/site-stats.ts`), never typed.
5. **Fandom names**: official first, then Wikipedia or Wikidata.
6. **Privacy and safety**: stage names and public roles only. No dating, health, family, scandal or
   private life. Minors: stage role only. No lyrics.
7. **On conflict or thin sourcing**: write the vaguer true sentence, and log the correction with a
   date in the corrections section of /editorial-policy.
