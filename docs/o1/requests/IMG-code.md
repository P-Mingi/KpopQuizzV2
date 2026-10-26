# Requests of lane IMG-code

1. docs/o1/contracts/twins.json, TWINS.md and LANES.md: a row 42 for /credits (the photo credits page asked by the owner on 2026-10-26).
   OtakuQuiz only, no kpop twin page. The registry route list needs the path (the middleware 404s a path it does not list) and
   contract.test.ts ("every anime route pattern of the registry is the route of a row") needs a row for it. The page is served by the
   file of rows 3 to 5 (app/sites/[site]/(anime)/[slug]/page.tsx dispatches on the slug credits), so no new screen file exists and
   twins.mts stays ok against the contract of O1 as it is. The row is in the lane, with its twin the kpop [slug] page and body local;
   O1 lists 42 in LANES.md. ORCH: confirm the row (or give the page its own file and its own row) when the lane merges.
2. docs/anime/images/*.json and apps/quiz/public/series/*.webp come from the lanes IMG-a and IMG-b. After their merge run, from
   apps/quiz, `npx tsx scripts/gen-series-images.mts` and commit src/lib/anime/series-images.generated.ts: series-images.test.ts fails
   while the generated file is behind the data (today the data folder does not exist and the map is empty: every series shows its
   title card).
