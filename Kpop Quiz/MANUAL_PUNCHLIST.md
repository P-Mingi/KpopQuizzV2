# MANUAL_PUNCHLIST.md — the ~5% the script can't do

The setup script handles roles, categories, channels, permission overwrites,
the role select-menu, and server defaults. The items below require the Discord
UI (no API, or API can't do them reliably). Do the ones marked **BEFORE** prior
to running the script.

## Before running the script
- [ ] **Create the server** and make yourself owner.
- [ ] **Enable Community** (Server Settings → Enable Community). Required before
      the `#announcements` announcement channel can be created, and before
      Onboarding/AutoMod. If this isn't on, the script still runs but the
      announcement channel falls back to a normal text channel.
- [ ] **Upload the server icon** — the rabbit mascot.
- [ ] **Create the bot** in the Discord Developer Portal, give it the
      `Administrator` permission (or Manage Roles + Manage Channels + Manage
      Server), enable the **Server Members Intent**, and invite it to the server.
- [ ] Make sure the **bot's role sits above** the roles it will manage
      (Server Settings → Roles) so it can assign them. The script tries to order
      roles but can't move itself above its own top role.

## After running the script
- [ ] **Custom emojis** — upload group logos + mascot expressions, then swap the
      placeholder emojis in `src/config.js` (`GROUP_EMOJI`) and re-run
      `npm run setup` to refresh the role menu.
- [ ] **Onboarding** (Server Settings → Onboarding) — turn it on and require new
      members to pick at least one group role before reaching the main channels.
      Wire the question to the same group roles the script created.
- [ ] **AutoMod** — add/review a basic rule for spam links + mass mentions.
- [ ] **Verification level** — script sets Medium; confirm it stuck.
- [ ] **Welcome / rules copy** — the channels exist but you should write the real
      `#welcome` and `#rules` wording (the script does not post placeholder copy
      into them, to avoid you having to delete it).
- [ ] **Scheduled Events** — optionally pre-create a recurring "Friday quiz
      night" (Server → Events).
- [ ] **Boosts / vanity URL** — boost-level perks and the vanity invite require
      boosts; set up later.

## Keep the role menu working
- [ ] The select-menu in `#roles` only assigns roles while the listener runs:
      `npm run menu` as a long-lived process (pm2 / systemd / a small host).
      If you'd rather not run a process, use Discord native **Onboarding** role
      selection instead and you can delete the menu.

## Don't launch until you can seed it
- [ ] Per the spec's strategic guardrail: do **not** open the server until you
      can post the daily quiz in `#daily-quiz` and greet newcomers every day for
      ~4 weeks. A dead server is worse than no server.

## Revealing channels as you grow
Hidden channels (`#1v1-battles`, `#blindtest`, `#score-flex`, `#quiz-requests`,
`#kpop-chat`, `#off-topic`, `#suggestions`, `#sneak-peeks`, `#events`, and most
per-group channels) are created but hidden. Reveal one with:

```
npm run reveal <channel-name>      # e.g. npm run reveal blindtest
npm run reveal --list              # see what's live vs hidden
```
