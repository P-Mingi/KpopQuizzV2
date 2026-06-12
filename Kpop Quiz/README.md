# kpopquiz.org — Discord server setup (Workstream J)

Code-driven build of the kpopquiz community Discord server. One idempotent
script creates every role, category, channel, permission overwrite, and the
role select-menu so the server launches fully configured: mod channels hidden,
group channels gated, announcements read-only, founding-creator space private.

Launch is **lean by design** — only ~12 channels are visible at start; the rest
are created but hidden and revealed on demand (`npm run reveal`).

## Quick start

```bash
npm install
cp .env.example .env        # fill in DISCORD_TOKEN and GUILD_ID
npm run setup:dry           # preview — no changes
npm run setup               # build the server
npm run menu                # run the role-menu listener (keep alive)
```

Do the **BEFORE** items in `MANUAL_PUNCHLIST.md` first (create server, enable
Community, invite the bot with admin).

## Files

| File | What it does |
|---|---|
| `src/config.js` | Single source of truth: roles, channels, overwrites, launch flags, role menu. **Edit this to change the server.** |
| `src/setup.js` | Idempotent builder. Roles → categories → channels → role menu → server defaults. Safe to re-run. |
| `src/roleMenu.js` | Posts the select-menu into `#roles`; standalone listener assigns group + Event Pings roles. |
| `src/reveal.js` | Reveal/hide a channel live (`npm run reveal <name>` / `--list`). |
| `src/store.js` | Persists created IDs to `src/generated-ids.json`. |
| `MANUAL_PUNCHLIST.md` | The ~5% that needs the Discord UI. |

## How it stays idempotent

Every create checks for an existing object first — by stored ID
(`generated-ids.json`), then by name. Re-running syncs overwrites/topics rather
than duplicating. Nothing is ever deleted. Tweak `config.js`, re-run
`npm run setup`.

## Launch set vs hidden

`launchAtStart: true` channels are visible day one. Everything else is created
but the `@everyone` ViewChannel permission is denied. Reveal later:

```bash
npm run reveal --list        # see live vs hidden
npm run reveal blindtest     # flip one visible
npm run reveal blindtest --hide
```

## Role self-assignment

Uses Discord **select menus** (recommended): members open the menu in `#roles`
and pick groups / opt into Event Pings. The role names are encoded in the menu
options, so the listener is stateless and survives restarts. Run `npm run menu`
as a long-lived process — or use Discord native Onboarding instead and drop the
menu.

> Test on a throwaway server first (`npm run setup:dry`, then a real run on a
> test guild), then point `GUILD_ID` at the real server.
