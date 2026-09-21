# KPOP-SOURCES - the grounding layer for the content engine

The authoritative sources the engine grounds facts and freshness on. Every K-pop claim in an article
(a group's members, debut date, fandom name, generation, discography) must trace to one of these, and
boundary/uncertain claims must be reframed or dropped. This is the layer that stops the
generation-label class of error (Stray Kids labelled 3rd gen, NewJeans/ILLIT/BABYMONSTER pinned to a
single gen) that v1 caught in review - see `docs/seo/CONTENT-ENGINE.md`.

**Golden rule:** two independent sources agree, or it does not go in as a fact. If sources conflict
or are thin (very new groups), state it qualitatively ("a recent breakout rookie") instead of
asserting a number, roster, or label. A vaguer true sentence always beats a precise wrong one.

## Tier A - profiles / factual data (members, debut dates, fandom names, discography)
Use these to verify a roster, a debut date, a fandom name, or a song list.
- **kprofiles.com** (kprofiles.com/{group}-members-profile) - the most complete fan-maintained
  profile DB. Trust for: member lists, positions, birth names, debut dates, fandom names. Caveat:
  fan-edited, so cross-check debut date + roster against the label profile for anything load-bearing.
- **Kpop Wiki (kpop.fandom.com)** - community wiki. Trust for: discography, release dates,
  member/lineup history (good for lineup changes). Cross-check with kprofiles.
- **Official label + group profiles** - HYBE / SM / YG / JYP / label artist pages and the group's
  official site. Trust as the primary source for debut date, current lineup, official romanization.
  This overrides fan sources on conflict.

## Tier B - news / comebacks / debuts (freshness signal)
Use these to decide whether a comeback/debut is live enough to prefer for freshness.
- **Soompi (soompi.com)** - English K-pop news, reliable dates + confirmations. Trust for: comeback
  announcements, debut confirmations, official statements.
- **allkpop (allkpop.com)** - English K-pop news. Trust for: the same freshness signal; treat
  headlines as leads to confirm, not as facts on their own.
- **Official group / label SNS** (X, Instagram, Weverse) - the primary announcement channel. Trust a
  label/group post as confirmation of a date or lineup; do not trust fan reposts.

## Tier C - chart / streaming context (is a song actually big right now)
Use these only for "which songs are charting" context, never for roster/date facts.
- **Circle Chart (circlechart.kr)** - the official Korean chart (ex-Gaon). Trust for: what is
  actually charting in Korea now.
- **Billboard (billboard.com)** - Global / K-pop charts for international context.
- **Spotify / YouTube public counts** - streaming context for "most-streamed" style phrasing; round
  and hedge ("one of the most-streamed"), never quote an exact count as a durable fact.

## Fact-check rules (apply in every article)
1. **Members / roster**: only from Tier A, cross-checked. Never invent or omit a member. If unsure of
   the exact count, say "the group" not "the N members".
2. **Debut date**: Tier A + a Tier B confirmation for recent debuts. Give the year, not a precise day,
   unless two sources agree on the day.
3. **Generation labels**: only from consensus, and only for uncontested groups. Boundary groups
   (debut near a gen line, or actively argued) get a neutral phrase, never a number. Safe buckets:
   3rd = BTS/BLACKPINK/TWICE/SEVENTEEN/EXO; 4th = aespa/IVE/LE SSERAFIM/ENHYPEN/ITZY. Everything after
   ~2023 (Cortis, ILLIT, BABYMONSTER, RIIZE, etc.) is "rookie / newest wave", not a gen number.
4. **Song titles / counts**: only assert a title you can source; never a fabricated tracklist. For
   counts that the site itself cannot confirm (e.g. the blindtest song count, 300-vs-4000 unresolved),
   stay qualitative.
5. **Fandom names**: Tier A. (This is how v1 learned COER = the Cortis fandom, not a separate group -
   see `docs/seo/AUDIT.md`.)
6. **On any conflict or thin sourcing**: reframe to a true, vaguer statement. Log the uncertainty in
   the article's EMAIL payload fact-check notes so the human reviewer sees what was hedged and why.
