# News auto-post system

Posts K-pop news headlines to the **#news** Discord channel automatically, every 30 minutes.
No server or host: runs as a **GitHub Actions cron**. Read-only channel — members can react but
not post. Bot drops the headline, the opening sentence, and the article link.

**Status: live.** Running on the `main` branch via GitHub Actions.

## Sources

| Source | RSS feed |
|---|---|
| Soompi | `https://www.soompi.com/feed` |
| Koreaboo | `https://www.koreaboo.com/feed/` |

Both are major English-language K-pop news outlets. Their RSS feeds are free and official.

## What gets posted

Into `#news` (read-only):
> **BTS Announces World Tour 2025**
> BTS has officially announced their long-awaited return to the stage...
> https://www.soompi.com/article/...

No AI involved. Title and opening sentence come directly from the RSS feed. The link goes straight
to the original article.

## How it works

1. Fetch both RSS feeds with `rss-parser`.
2. For each article, check if its URL was already posted (dedup by scanning the last 40 messages
   in `#news` for the URL). Skip if found.
3. Post the **title**, **opening sentence** (first ~200 chars of the description, HTML-stripped),
   and the **article URL** as a plain message.
4. Discord renders a link preview below the text.

No database. No stored state. The dedup window is the channel's message history (~40 messages).

## Automation (cron)

- **Workflow:** `.github/workflows/news.yml`
- **Schedule:** `*/30 * * * *` — every 30 minutes (UTC). Plus manual `workflow_dispatch`.
- **Runs on:** GitHub Actions (`main`). **Free** (public repo), no host.
- **Secrets used:** `DISCORD_TOKEN`, `GUILD_ID`.

## Files

| File | Role |
|---|---|
| `Kpop Quiz/src/news.js` | the fetcher + poster (`npm run news`) |
| `.github/workflows/news.yml` | the 30-minute cron |

## Tweaking

- **Add a source:** add its RSS URL to the `FEEDS` array in `src/news.js`.
- **Change frequency:** edit the `cron` line in `news.yml`.
- **Longer excerpt:** increase the character limit in the description-truncation logic in `news.js`.
