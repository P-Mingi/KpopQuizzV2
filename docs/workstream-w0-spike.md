# W0 - Verse feasibility spike (open-data coverage audit)

## Claude Code Prompt

---

READ-ONLY SPIKE. No migrations, no product code, no schema. One commit allowed:
scratch scripts under scripts/spike-w0/ + the report at docs/w0-report.md.
Context: docs/VERSE-MASTER-VISION.md + docs/VERSE-ROADMAP.md (read both first).
The verdict here shapes W1's entire entity schema. Be brutal and exact - an
over-optimistic coverage report poisons everything downstream. NO em dashes.

## What to probe (official endpoints only, rate-limited, polite)

Sources: Wikidata SPARQL endpoint (query.wikidata.org) + MusicBrainz API
(musicbrainz.org/ws/2, 1 req/sec, proper User-Agent per their etiquette).
Wikipedia REST only if needed for spot checks. Nothing else. No scraping of any
website; these are official public query services - stay within their usage
policies and SAY SO in the report (cite the policy pages).

## W0.1 - Wikidata coverage audit

For our 20 flagship groups (the T1.5 list: BTS, BLACKPINK, Stray Kids, TWICE,
aespa, NewJeans, SEVENTEEN, IVE, TXT, ENHYPEN, LE SSERAFIM, ITZY, NCT, EXO,
Red Velvet, (G)I-DLE, ATEEZ, NMIXX, RIIZE, BABYMONSTER) plus a random 10 from
our remaining 67 DB groups (the long-tail reality check):

1. Entity resolution: can each group be found reliably (QID)? By what key
   (name? MusicBrainz ID cross-ref?)? Report ambiguous/failed matches honestly.
2. Group fields: debut date, agency/label, members list (current + former
   distinguished?), fandom name, origin country, official website. Per-field:
   present / absent / wrong, per group. MATRIX, not prose.
3. Idol coverage: for each group's members - own QID? birth date, position/role,
   nationality, name variants (romanization, hangul)? Count members found vs
   our name-all rosters (the ground truth we already have - cross-check counts
   and names, report mismatches).
4. LIVING-PERSONS CHECK: what personal-life data does Wikidata carry that our
   policy EXCLUDES (relationships, family, residences)? Confirm our ingestion
   can field-whitelist so excluded data is never even fetched. List the
   whitelist you would use.

## W0.2 - MusicBrainz discography audit

Same 20 + 10 groups:
1. Artist resolution (MBID), including tricky names ((G)I-DLE, f(x)-style
   punctuation, NCT's units).
2. Per group: release groups (albums/EPs/singles) count, release dates,
   tracklists present? Korean vs Japanese releases distinguished? Reissues/
   versions noise level (this is MusicBrainz's known weakness - quantify it:
   for 3 groups, how much manual curation would a clean discography need?).
3. Cross-check against our songs table: how many of our ~4k songs can be
   matched to MusicBrainz recordings (sample 100, report match rate + method)?

## W0.3 - The verdict report (docs/w0-report.md)

1. The coverage matrices (W0.1 + W0.2), per group, per field.
2. Honest quality tiers: which entity types are auto-seedable at launch quality
   (my guess: group basics + idol basics + album lists = good; tracklists =
   noisy; fandom names = spotty - VERIFY, do not accept my guesses)?
3. The curation gap: what MUST founding curators fill by hand (quantify: hours
   per space, roughly)?
4. Schema recommendation: entity types + fields for W1.1, the ingestion
   whitelist (living-persons enforced at fetch), the conflict model.
5. Rate-limit + refresh reality: how long does a full backfill take politely?
   Weekly refresh cost?
6. Risks found (licensing notes: Wikidata = CC0, MusicBrainz = mostly CC0/
   attribution for some - confirm exact terms and what attribution we owe).
7. STOP. No W1 work until the owner reads this and green-lights.

/caveman the summary: the matrices as tables, the tiers, the curation-gap hours,
and your one-paragraph honest verdict: is day-one seeding at launch quality
FEASIBLE, PARTIAL, or NO for the 3-space launch?
