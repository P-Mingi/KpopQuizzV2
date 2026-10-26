# Code: show the free series images on otakuquiz.org (owner rules, 2026-10-26)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-imgcode, branch o1/imgcode (= o1/integration). Q = apps/quiz/src.
Read this brief, docs/o1/briefs/IMG-content.md (the data shape), docs/o1/briefs/LD.md (rule 18 and kpop rules), Q/components/anime/
series-art.tsx, register-art.tsx, dress-quiz-card.tsx, Q/lib/anime/series-art.ts, Q/lib/anime/series-types.generated.ts and its
generator (the model for a generated map), how kpop shows group photos (Q/lib/ux-v1/a0/group-photos.ts), and the code you change.
## Rules
No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets. No en or em dash, no emoji. Never
`git add -A`; files by path. kpopquiz.org unchanged: same client modules and chunk count (the two kpop chunk scripts).
## Do
1. A generator (apps/quiz/scripts/gen-series-images.mts) builds Q/lib/anime/series-images.generated.ts from docs/anime/images/*.json
   (slug to file, alt, attribution line or null, fallback); a test fails when the generated file is behind the data or a listed file
   is missing in public/series/, or an entry lacks source_url, author, license, license_url, retrieved.
2. Where the series art shows today (avatar, card strip, series hub header, series list, quiz cards through the SERIES_ART dress), an
   image entry shows the photo (next/image, sizes as the kpop group photos, the alt of the entry); a fallback or no entry shows the
   generated title card (today's SeriesArt: series colour plus title). Nothing written over the photo except the existing title UI.
3. Attribution where the licence requires it (CC BY, CC BY-SA): a small credit line "Photo: <author>, <licence>" linked to the source
   and licence, on the series hub header (and a page /credits listing every image with its source, author, licence and date, linked
   from the anime footer). Unsplash and Pexels: credit on /credits only.
4. The general mix group (anime-mix) and the hub use the same mechanism if their block shows a series picture.
5. Seed two entries for the tests (fixtures only, not real data).
## Checks
Unit tests (generator, fallback, attribution rule per licence, credits page), tsc 0, full vitest green (--testTimeout=30000),
check.sh ok, the three builds, the two kpop chunk scripts. One commit ("o1: IMG code ..."; last line
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back in 5 lines.
