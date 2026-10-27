# Content: one free image per OtakuQuiz series (owner rules, 2026-10-26), a batch named in your prompt
Worktree: named in your prompt (a branch from o1/integration). Read this brief only, then the series files of your batch.
## The owner's rules (exact)
- Forbidden: any official or derived image (posters, manga covers, screenshots, characters, logos, fan art, cosplay, merchandise),
  even found on Wikipedia, and any staging that imitates a character or a scene.
- Allowed sources only: Unsplash, Pexels, and Wikimedia Commons files under CC0, public domain, CC BY or CC BY-SA (places, cities,
  creators at conferences).
- Per series: one photo of real objects or places that evokes the series, with nothing written on it (no title, no name, no readable
  sign), no recognisable face except photos of the creators. Examples: a black notebook and an apple (Death Note), a bowl of ramen
  (Naruto), Tokyo at night (general quizzes). If nothing fits, write `"fallback": "title-card"` and no image (a generated title card
  is shown); never a random image.
## Do, per series of your batch
1. Find the photo on the allowed sites (open the page; read its licence on the page itself). Download the original once.
2. apps/quiz/public/series/<slug>.webp: WebP, 736 px wide, 3:4 crop (736 x 981), quality tuned to stay under 120 KB, no text
   added, metadata stripped (sharp is in node_modules: `node -e` with sharp).
3. docs/anime/images/<slug>.json: { "slug", "file": "/series/<slug>.webp", "source_url" (the photo page), "author", "license"
   (exact name: Unsplash License, Pexels License, CC0, Public domain, CC BY 4.0, CC BY-SA 4.0 ...), "license_url",
   "attribution_required" (true for CC BY and CC BY-SA), "retrieved" (YYYY-MM-DD), "alt" (what the photo shows, plain words, no
   series name), "why" (one line: how it evokes the series) } or { "slug", "fallback": "title-card", "why" }.
4. Reject on sight: a face (except a creator), any text or logo, anything that looks like the work, AI-generated looking art.
## Rules
No push, no production, no connector, never open ~/kpq-o1/secrets. Never `git add -A`; files by path. No en or em dash, no emoji.
Commit per 5 series ("o1: IMG <batch> ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 5 lines: sha, images per source, licences, title-card fallbacks (and why), anything doubtful.
