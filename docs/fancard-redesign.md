# Fan Card redesign - concert ticket (owner-approved final)

## Claude Code Implementation Prompt

---

Rebuild the Fan Card renderer (`app/api/fancard/[username]/route.tsx`) to match the
owner-approved "concert ticket" design 1:1. The reference markup below is the DESIGN
CONTRACT: reproduce the exact layout, proportions, colors, and type scale, scaled from the
300x375 reference to the real 1080x1350 canvas (multiply sizes by 3.6). NO em dashes.
Git commit only, do NOT push.

Also fix the flair-font gap from F2c C5 (fonts section below).

## Reference markup (approved prototype, 300x375; scale x3.6 to 1080x1350)

```html
<div style="width:300px;height:375px;border-radius:18px;background:#141019;overflow:hidden;position:relative;font-family:Archivo,sans-serif;">

  <div style="background:#E8457A;padding:13px 20px 11px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-family:Syne;font-size:16px;font-weight:800;color:#3d0a1e;letter-spacing:0.06em;">FAN CARD</span>
    <span style="font-family:Syne;font-size:13px;font-weight:700;color:#7a1f42;">№ 0042</span>
  </div>

  <div style="padding:18px 20px 0;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:64px;height:64px;border-radius:18px;border:2.5px solid #E8457A;overflow:hidden;background:#241b30;">
        [AVATAR: real avatar_url photo, object-fit cover; else preset image; else initials
         on #3a2d44, white, weight 600]
      </div>
      <div>
        <div style="font-family:Syne;font-size:30px;font-weight:800;color:[FLAIR_ACCENT];line-height:1;">mingi</div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <span style="font-size:10px;letter-spacing:0.08em;color:#141019;background:#E8457A;padding:3px 9px;border-radius:4px;font-weight:600;">LV 9 STAN</span>
          <span style="font-size:10px;letter-spacing:0.08em;color:#c9bfd4;border:1px solid #453a52;padding:3px 9px;border-radius:4px;">SINCE 2019</span>
        </div>
      </div>
    </div>

    <div style="font-size:12.5px;color:#b3a6c4;margin-top:14px;">bias <span style="color:[FLAIR_ACCENT];font-weight:600;">Felix</span></div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <span style="font-size:11px;color:#ffb3cd;background:#2b1a24;padding:4px 10px;border-radius:20px;">[heart icon] Stray Kids</span>
      <span style="font-size:11px;color:#ffb3cd;background:#2b1a24;padding:4px 10px;border-radius:20px;">[heart icon] aespa</span>
    </div>

    <div style="display:flex;margin-top:16px;border-top:1px dashed #453a52;padding-top:13px;">
      <div style="flex:1;"><div style="font-family:Syne;font-size:21px;font-weight:700;color:#fff;">3<span style="font-size:13px;color:#8d819c;">/87</span></div><div style="font-size:8.5px;letter-spacing:0.12em;color:#8d819c;margin-top:2px;">MASTERED</div></div>
      <div style="flex:1;"><div style="font-family:Syne;font-size:21px;font-weight:700;color:#fff;">1.2K</div><div style="font-size:8.5px;letter-spacing:0.12em;color:#8d819c;margin-top:2px;">TOTAL PLAYS</div></div>
      <div style="flex:1;"><div style="font-family:Syne;font-size:21px;font-weight:700;color:#e8b64c;">86%</div><div style="font-size:8.5px;letter-spacing:0.12em;color:#8d819c;margin-top:2px;">SKZ ACCURACY</div></div>
    </div>
  </div>

  <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #2a2233;">
    <span style="font-size:10.5px;color:#8d819c;">kpopquiz.org/u/mingi</span>
    [BARCODE: row of 10 vertical bars, widths 2/1/3/1/2/4/1/2/1/3 px, height 14, color #c9bfd4, gap 2]
  </div>
</div>
```

## Data mapping (placeholders -> real)

- `№ 0042` = the user's SIGNUP RANK: `count(*) FROM profiles WHERE created_at <= this
  user's created_at`, zero-padded to 4. Real number, collectible flex. Cache it with the
  card (1h cache already set); do not add a column.
- `[FLAIR_ACCENT]` = the user's `name_accent` resolved via `nameAccentColor()` from
  passport-flair.ts, brightened for the dark bg if the resolved color is too dark
  (contrast >= 4.5:1 against #141019; the prototype's pink is #ff7eb0 for default brand).
  Bias name uses the same accent.
- `LV 9 STAN` chip = real level + short title, uppercase.
- `SINCE 2019` chip = stan_since; chip OMITTED entirely when unset (do not shift layout,
  the LV chip just stands alone).
- Avatar = real photo (avatar_url) with cover crop inside the 18px-radius square; preset
  image if avatar_kind = preset; initials fallback. Ring stays #E8457A ALWAYS (profile_theme
  does NOT retint the card v1 - the ticket is brand-colored merch).
- Ult chips: up to 3, real heart glyph (use an inline SVG heart path, satori-safe, NOT an
  icon font), color #ffb3cd on #2b1a24.
- Stat cells (LIFETIME stats only, owner decision - no volatile streak, no badge coin):
  1. MASTERED: "{mastered}/{total_groups}" - groups mastered from passport spine; the /N
     part smaller (13px ref) in #8d819c; total = real groups count. Show even at 0/87.
  2. TOTAL PLAYS: quizzes_played + blindtests_played (passport counters), formatCount
     style ("1.2K"). Hide cell only if 0.
  3. {GROUP} ACCURACY: best tracked group accuracy, GOLD #e8b64c number, label = short
     group name uppercase. Hide if no tracked group.
  Hide missing cells; remaining cells keep flex:1 spread.
- Barcode = decorative flex row of divs per the widths above. Not a real barcode. Static.
- Footer URL = real /u/{username}.

## Fonts (fixes the F2c flair gap)

satori accepts TTF/OTF/WOFF (NOT woff2) via the `fonts` option.

1. Add `Syne` TTFs (weights 700 + 800) to `public/fonts/` (download from Google Fonts,
   OFL license - include the license file). Syne = the card's display font (name, FAN CARD,
   №, stat numbers).
2. Labels/body = the renderer's existing DM Sans (site font, already loaded).
3. FLAIR FONT FIX: bundle TTFs for each `name_font` preset in passport-flair.ts
   (check what the presets are - serif/mono/rounded etc.), map preset -> font file, and pass
   the user's flair font into the ImageResponse `fonts` array. The NAME renders in the
   user's flair font WHEN their preset is not default; default preset = Syne 800 as per
   the contract. If a preset's font has no free TTF, fall back to Syne and note it.
4. Load font files server-side via fs (public/fonts path), not fetch, so the route works
   in all environments. Cache the buffers module-level.

## Rules

- Satori constraints: flex only (no grid), the absolute-positioned footer is fine, dashed
  border is supported; verify the № glyph renders in Syne (if the ₦umero sign is missing
  from the font, use "NO." instead - check, don't assume).
- Share sheet, caching, allowlist, analytics: unchanged from F2c C5.
- Verify 3 variants again: full profile, minimal (no stan_since, no badge, no ults),
  not-found. Minimal card must still look intentional (chips/cells omitted cleanly).
- Screenshot all 3 variants in the report.
- tsc clean, build green, zero em dashes, no new npm dependency (fonts are static assets,
  not packages).

/caveman report: screenshots, scale math check (one element measured), font files added +
licenses, flair-font mapping table, deviations + why.
