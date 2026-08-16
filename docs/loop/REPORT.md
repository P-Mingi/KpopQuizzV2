# REPORT - W4b items 2 and 4 done. Item 3 blocked, with the shape written out.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0** ·
`check:indexability` -> **0**, embed still absent from the sitemap.

Commit: `08d32bf`. Proofs: `docs/proofs/w4-embed/theming.txt`.

---

## Item 2, theming: every input validated

The hex is **rebuilt from a regex capture** rather than passed through, so only
`[0-9a-f]` can ever reach the stylesheet, and only two tokens are exposed so a partner
cannot repaint arbitrary parts of the widget.

```
(no params)      class="embed-page"        background:transparent
?theme=dark      class="embed-page dark"
?theme=BOGUS     class="embed-page"        <- unknown value falls back to light
?accent=00ff88   --brand:#00ff88;--brand-btn:#00ff88
?accent=ff0      --brand:#ff0              <- 3-char hex accepted
?accent=red);}   (ignored)                 <- injection attempt refused
?accent=zzzzzz   (ignored)                 <- malformed refused
?bg=101010       background:#101010
```

A malformed URL renders the default widget, never a broken one.

## Item 4, the generator

`/admin/embed`: pick a quiz, set the partner key, choose a theme, copy the block. It
lives under `/admin`, which is already noindex and already out of the sitemap, so it
inherits both instead of needing a new rule.

The UI is a thin shell over the tested `buildEmbedSnippet()`, so it cannot produce a
block that function would not, and specifically cannot produce one without the
outside-iframe `<a>`. Verified in the rendered page: both `on kpopquiz.org` and
`kpopquiz-embed` are present.

## Item 3: BLOCKED, and I would not build it yet anyway

The partner log has nowhere to write. Probed live: `embed_views`, `embed_log`,
`partner_embeds`, `share_events`, `events` all absent. No existing table is an
appropriate home either. Writing embed impressions into `plays` or `game_plays` would
corrupt the counts that feed `/stats` and the W5 data-PR play, which is precisely the
asset the covenant exists to protect.

BLOCKED.md carries the exact `CREATE TABLE`, three options, and this recommendation:
**rely on the utm tags for now, apply the table when a real partner exists.** The utm
tags already answer the question that matters at zero partners, and an empty table plus
a retention cron is cost before value. Saying it plainly: this is the one W4b item I
would not build today even if the DDL were free.

## Deviations and flags (loud)

1. **The floating theme circle still renders inside the iframe.** I flagged it last run
   and did not fix it this run. It sits outside the chrome block, so it needs its own
   one-line gate. Still site furniture in a partner's page.
2. **The generator is a select plus two inputs**, not a preview. You see the snippet
   text, not a live render of what it produces. Adequate for internal use, worth knowing
   before it is handed to anyone else.
3. **Theming is proven by the served HTML**, not by a screenshot of a dark widget. The
   class and the custom properties are what drive the render, and those are what I
   checked.

## Covenant

Zero added lines matching fake / synthetic / dummy / placeholder / `Math.random`. The
snippet prints no counts, so there is nothing in it to inflate.

## Next

The widget is complete apart from the partner log, which is your call, and the floating
element in flag 1. After that, W4 has nothing left and the authority lever is only
waiting on outreach, which needs a deploy.

---

STOP. **Nothing was pushed.** report pret.
