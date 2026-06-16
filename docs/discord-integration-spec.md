# kpopquiz.org — Discord Community Integration (Workstream K) — DRAFT

> **Status: DRAFT.** The placement strategy below is final-ish; the server-specific bits
> (invite link, name, member count, widget) are placeholders pending the server description.
> Same engagement rules: one step at a time, dual-skill audit on UI steps, update Notion.

## 0. Principle — a few high-intent touchpoints, never nagging chrome

Discord shows up where community/sharing is genuinely relevant, at moments the player already
feels something (finished a game, about to share, exploring the site). It is NOT plastered on
every header or shoved in the top nav. Smart, minimal, useful. Synergy: B23 adds **Discord
OAuth**, so "log in with Discord" + "join our Discord" reinforce each other.

## 1. Server details

- Server name: **Kpop Quiz**
- Guild ID: **1514908800505872465**
- Permanent invite link: **https://discord.gg/X7AW95WFT**
- Server widget: **ENABLED** → `https://discord.com/api/guilds/1514908800505872465/widget.json`
  returns live `presence_count` (online now) + an online-members array + `instant_invite`.
- Vibe / features (for copy): daily quiz posted in-channel · KMQ blindtest games · 88
  self-assignable bias-group roles · onboarding · AutoMod. Brand-native, kawaii rabbit energy.
- Channels worth name-dropping in copy: daily-quiz, blindtest/KMQ, bias roles.

### Widget approach (important — do NOT use the raw Discord iframe)
The standard Discord embed iframe is heavy, off-brand, and causes layout shift (the user cares about
perf/SEO/mobile). Instead render a **custom, on-brand widget**: fetch widget.json (server-side via a
small cached route, or client-side after mount), and show **"{presence_count} online now"** + a few
member avatars + a **Join** button (brand-styled, the rabbit). Cache the count (~60s) and never block
render on it. This is the live "online + join" preview, native to the kpopquiz look.

## 2. Placements (the strategy)

**K1 — Footer (persistent, low-key).** Add a "Discord" link in the footer Community column,
beside Reddit. Brand-token styled, with the Discord glyph. Always present, never loud.

**K2 — Result screens (the high-intent moment).** On the quiz result card (B7), the blindtest
results, and later the battle result (E), a single tasteful line/button: e.g. "Think you can do
better? Argue about it on Discord →" or "Compare your score with the community →". One line, not
a popup, not a modal. This is where engagement peaks, so it is the best conversion point.

**K3 — Share-card customizer = Discord as a share destination (ties into H6).** The funnel's
share-card customizer already lists Discord as a platform. Because Discord has no web share
intent, "Send to Discord" copies the share link + the card and prompts the user to paste it.
Keep the UTM pattern (utm_source=discord). No extra work beyond what H6 already plans — just
confirm Discord is a first-class target there.

**K4 — Community block (About + optional home strip).** A compact "Join the community" block on
the About page (and optionally a single subtle strip on the home lobby, below the fold): server
name + one line + member count + a Join button. If the widget is enabled, embed the live Discord
widget (online members + join) here ONLY — it is the one place a richer element fits. One block,
one page (plus optional home strip); not everywhere.

**K5 — Login page reinforcement (light).** The login page is already community-framed and B23
adds Discord OAuth. Optionally add a one-line "or join our Discord community" link under the auth
options. Light touch; do not duplicate the big community block here.

**Explicitly AVOID:** Discord in the top nav, interrupting popups/modals during play, a Discord
button on every page header, auto-join prompts, or more than one rich widget.

## 3. Build order (Workstream K)

1. **K0** — Finalize this spec with the server description (invite, name, count, widget/server ID,
   channels). Confirm placements with user. (Gate: needs the description.)
2. **K1** — Footer Discord link (quick).
3. **K2** — Result-screen Discord line (quiz + blindtest now; battle later in E). Dual-skill audit.
4. **K3** — Confirm Discord as a share destination in the H6 share-card customizer (coordinate
   with Workstream H; may be folded into H6).
5. **K4** — Community block on About (+ optional home strip); embed the live widget if enabled.
   Dual-skill audit.
6. **K5** — Optional light Discord line on the login page.
7. **K6** — Monitor: Discord referral clicks (utm_source=discord), join conversion from each
   placement; weight toward the placement that converts.

## 3b. Deeper growth strategy (K7+) — funnel INTO the server, smart not aggressive

The footer/result-line/widget are "here's our Discord." The stronger move is to make the server a
*destination for the things people already do on the site* — pull activity INTO it.

**K7 — "Flex in the Discord" (result -> server channel via webhook). The headline new mechanic.**
On a GOOD result / a battle win / a level-up, an OPT-IN "Brag in the Discord" button posts a clean
embed (the share card + score + "can you beat it?" + the quiz link) to a `#flexes` (or `#results`)
channel via a **Discord webhook** (server-side; the site posts on the user's behalf with a chosen
display name, anon-safe). This seeds the server with real content + FOMO and gives a reason to join.
Guardrails: opt-in (a button, never automatic), rate-limited per voter_hash/day, only surfaced on
strong results so the channel isn't spammed, and a kill switch. The webhook URL is a server secret.

**K8 — contextual cross-promotion (one line each, at the moment it helps):**
- **Battle cold-start:** "No one to battle? Find opponents in our Discord #find-a-battle ->" on the
  battle screen / share. This literally solves the battle friend-graph problem via the community.
- **Daily ritual:** the server already posts a daily quiz — the site's daily card can note "today's
  quiz is live in the Discord too, play together." Shared daily = shared ritual.
- **Level-up card:** the L2 "share your level-up" can offer "post it in the Discord" (webhook, K7).
- **Empty/cold states** (no rankings yet, 404): a soft "meanwhile, hang out in the Discord."
Each is a single contextual line, never a popup.

**External promotion (your "can I promote on other servers?" question):**
- Do NOT cold-post your invite in other K-pop servers' general chats — most ban self-promo, and it
  reads as spam. High risk, low return, brand damage.
- DO instead: (1) **Server partnerships** — mutual shoutouts / a `#partners` exchange with other
  K-pop servers (Discord's Partner Program if eligible). (2) **Server-listing sites** — Disboard,
  Discadia, top.gg, Discord Server Discovery (if eligible) — legit inbound. (3) **Your Reddit**
  (r/Kpop_Verse) + the site's share cards are the organic engine — let the SITE funnel to Discord,
  not the other way. (4) Genuine participation in fan communities with the link in your profile/bio,
  not pasted in chats. The site -> Discord funnel (K1-K8) is the compounding, ban-free growth loop.

## 4. Why this works

Discord is placed at the three moments that matter — finished a game (K2), about to share (K3),
and deliberately exploring/community (K4) — plus a quiet always-there link (K1). It compounds the
existing Reddit community link and the Discord OAuth, without turning the product into an ad for
the server.
