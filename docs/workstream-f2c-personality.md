# F2c - Personality pack (flair preview, theme wire, stan since, Fan Card)

## Claude Code Implementation Prompt

---

F2c: make K-pop identity expressive and portable. Four features, one spine: flair set once,
seen everywhere, exportable. Prereqs: M1.29 passport + F2a/F2b shipped.

Hard rules: NO em dashes. Real `<Mascot>` + real badge PNGs + real logo (`logo-primary.svg`),
never drawn approximations. REAL DATA ONLY. Git commit per step, do NOT push. New public
routes -> route allowlist, `check:routes` green. /u stays static/ISR, /me stays dynamic.
Dual-skill audit before + after. Migration numbering: 108-111 taken -> this workstream = 112.

Owner-approved design (prototype validated):
- Fan Card: portrait 1080x1350 ONLY (no square v1). Dark card #1c1521-family, theme-colored
  top bar + avatar ring, flair-colored name, LV + title, "stan since YYYY · bias X" line,
  ult heart chips, 3 stat cells (best-group accuracy, streak, top badge coin), footer
  "kpopquiz.org/u/{username}" + optional QR.
- QR: toggle, DEFAULT OFF.

---

## C1 - Migration `112_stan_since.sql`

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stan_since smallint
  CHECK (stan_since IS NULL OR (stan_since >= 1992 AND stan_since <= extract(year from now())));
```

(1992 = K-pop's conventional birth year, Seo Taiji and Boys debut. Future years impossible.)
Owner runs on prod dashboard. Include in the update-profile API's allowed fields + zod/type
validation mirroring the same bounds.

## C2 - Settings live flair preview

`app/settings/page.tsx`: at the TOP of the flair section (name accent / font / pinned badge /
bias), render a live preview card labeled "How you appear to others": the user's own
PersonCard `compact` fed from the CURRENT unsaved form state (accent, font, badge, bias),
inside a comment-row-styled container (same visual as quiz-comments rows). Updates on every
picker change, before save. Reuse PersonCard itself - do NOT build a lookalike (drift risk).
Add the "stan since" input here too (year select, 1992..current, optional, "-" = unset).

## C3 - Profile theme wire audit + fix

`profile_theme` column (mig 086) + settings picker exist. AUDIT: does /u actually use it?
Read passport-view.tsx and check. Expected finding: dead setting.
Wire it: the theme sets the passport header's accent (avatar ring color + XP bar fill +
ult-chip border tint) on /u and /me. Theme values: keep whatever the settings picker already
offers (verify the value set; if it is group slugs, resolve color via groups.display_color;
if named palette, map in `passport-flair.ts`). Default theme = current brand look, zero
visual change for users who never picked. ISR safety: theme comes from the same profile row
the page already fetches - no new query.
Also tint the settings live-preview (C2) so picking a theme shows immediately.

## C4 - Stan since display

- Passport meta line (M1.29 header): append "· stan since 2019" when set. The line already
  ellipsizes; keep order: @handle · bias · stan since · followers · member since. If too
  long at 430px, drop "member since" from the visible line first (it is the least
  identity-relevant).
- Fan Card: "stan since YYYY · bias X" line (C5).
- NOT shown in PersonCard compact (comment rows stay lean).

## C5 - Fan Card export (centerpiece)

**Route:** `app/api/fancard/[username]/route.tsx` - ImageResponse (same infra as the existing
OG-image routes from Workstream H; read one of those first and match the pattern).

- Portrait 1080x1350. Layout per approved prototype: top bar 6px in theme color; "FAN CARD"
  eyebrow + kpopquiz wordmark (real logo asset); avatar 128px in theme-colored ring (real
  avatar_url / preset / initials fallback - reuse the PersonCard resolution logic); name in
  flair accent color + font; "LV {n} · {title}"; "stan since YYYY · bias X" (omit missing
  parts gracefully); up to 3 ult heart chips; 3 stat cells: best-group accuracy ("SKZ 84%",
  from player_group_mastery best tracked group, hide cell if none), current streak (hide if
  0), top badge (pinned badge PNG, else highest-tier earned, hide if none - never an empty
  coin); footer "kpopquiz.org/u/{username}" + QR ONLY when ?qr=1.
- Cell-hiding rule: 3 cells -> shrink to the cells that exist, centered. A brand-new account
  gets name + level + footer only; still looks intentional.
- QR: generate via a tiny dependency-free QR draw or an SVG QR lib ONLY if one is already in
  the tree; if it needs a new npm package, SKIP QR entirely v1 and note it (default is OFF
  anyway - do not add a dependency for an off-by-default feature).
- Caching: `Cache-Control: public, s-maxage=3600, stale-while-revalidate`. Data reads =
  public profile fields only. Route is public (any username's card can be viewed - it shows
  only public passport data) -> add to route allowlist.
- **Share button:** on the OWN passport (/me and own /u view), in the header area:
  "Share my Fan Card". Opens a small sheet: card preview img + QR toggle (default off) +
  native share (navigator.share with the PNG file when supported, else download) + copy-link.
  Fires existing `share_click` analytics with type... `share_click` takes GameType - widen
  the union with 'fancard' (one type addition, not a new event).

## Build order (commit each, NO push)

1. C1 migration 112 written -> OWNER RUNS -> verify column + API field. Commit.
2. C2 settings live preview + stan-since input. Commit.
3. C3 theme audit (report findings first) + wire. Commit.
4. C4 stan-since passport display. Commit.
5. C5 fancard route + share sheet. Commit.
6. Consistency pass: dark/light, 430px, fresh-account card render, /u still static,
   check:routes, tsc, build. Commit.

## Verification

- [ ] Live preview reflects unsaved picker state instantly, uses real PersonCard
- [ ] Theme: /u + /me tinted for theme-pickers, pixel-identical to before for defaults
- [ ] stan_since bounds enforced DB + API; passport line ellipsis order correct at 430px
- [ ] Fan Card renders real data for: full profile, minimal profile, no-badge profile
- [ ] QR absent by default, present with ?qr=1 (or cleanly skipped if it needed a dep)
- [ ] Share sheet: native share on mobile, download fallback desktop
- [ ] No fabricated stats on cards; cells hide when empty
- [ ] /u build symbol unchanged; fancard route cached; allowlist green
- [ ] tsc clean, build green, zero em/en dashes, no new npm dependency (except none)

/caveman report per step: screenshots (incl. 3 fancard variants), theme audit finding,
deviations + why.
