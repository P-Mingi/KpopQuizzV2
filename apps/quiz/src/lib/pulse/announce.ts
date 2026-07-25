import type { PulsePayload } from './compute';

// Workstream T0: distribute one monthly Pulse. Discord embed via the existing
// flex webhook (DISCORD_FLEX_WEBHOOK_URL, read from env only, NEVER logged,
// kill-switch 503/skip when unset), plus a semi-automatic Reddit draft carried
// in the same Discord message as a spoiler block. The owner reveals, copies,
// and posts to Reddit manually; nothing is ever auto-posted to Reddit.

const BRAND = 0xe8457a; // --brand
const DISCORD_CONTENT_MAX = 2000; // hard Discord limit for message content

function origin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://kpopquiz.org';
}

export function pulseMonthUrl(month: string, utm = true): string {
  const base = `${origin()}/data/pulse/${month}`;
  return utm ? `${base}?utm_source=discord&utm_medium=community&utm_campaign=pulse` : base;
}

/**
 * The owner-facing Reddit draft. Humble r/kpop tone, no spam, real numbers
 * only. Owner copies this and posts manually. No em dashes (house rule).
 */
export function buildRedditDraft(payload: PulsePayload): { title: string; body: string } {
  const { fandom, duel, community, mostPlayed, monthLabel, month } = payload;
  const url = pulseMonthUrl(month, false);

  const lines: string[] = [];
  lines.push(`Every month I pull the real numbers from kpopquiz.org (a free, fan-made K-pop quiz site) and share what fans actually played and voted on. Here is ${monthLabel}.`);
  if (fandom) {
    lines.push('');
    lines.push(`**Fandom of the month:** ${fandom.name}, with ${fandom.plays.toLocaleString('en-US')} quiz plays.`);
  }
  if (mostPlayed.length > 0) {
    lines.push('');
    lines.push('**Most-played quizzes:**');
    mostPlayed.forEach((q, i) => lines.push(`${i + 1}. ${q.title} (${q.plays.toLocaleString('en-US')} plays)`));
  }
  if (duel) {
    lines.push('');
    lines.push(`**Duel verdict:** fans crowned ${duel.winner} in "${duel.prompt}" with ${duel.votes.toLocaleString('en-US')} votes.`);
  }
  lines.push('');
  lines.push(`**This month on the site:** ${community.plays.toLocaleString('en-US')} quiz plays, ${community.quizzesCreated.toLocaleString('en-US')} new quizzes, ${community.newFans.toLocaleString('en-US')} new fans.`);
  lines.push('');
  lines.push(`Full report, free to cite with a link: ${url}`);
  lines.push('');
  lines.push('(Mods, please remove if this is not allowed. Not trying to spam, just sharing fan data.)');

  const title = fandom
    ? `K-pop Pulse, ${monthLabel}: ${fandom.name} was the most-played fandom`
    : `K-pop Pulse, ${monthLabel}`;
  return { title, body: lines.join('\n') };
}

export interface PulseDiscordMessage { content: string; embeds: Array<Record<string, unknown>> }

/** The full Discord message: a branded embed plus the spoilered Reddit draft. */
export function buildPulseDiscordMessage(payload: PulsePayload): PulseDiscordMessage {
  const { fandom, duel, community, monthLabel, month } = payload;
  const url = pulseMonthUrl(month);

  const ogTitle = `K-pop Pulse ${monthLabel}`;
  const ogSub = fandom
    ? `${fandom.name} led the month with ${fandom.plays.toLocaleString('en-US')} plays`
    : 'Monthly first-party K-pop fan data';
  const ogImage = `${origin()}/api/og/page?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogSub)}&accent=%23e8457a`;

  const desc: string[] = [];
  if (fandom) desc.push(`**${fandom.name}** was the month's most-played fandom with **${fandom.plays.toLocaleString('en-US')}** quiz plays.`);
  desc.push('');
  desc.push(`**${community.plays.toLocaleString('en-US')}** quiz plays  ·  **${community.quizzesCreated.toLocaleString('en-US')}** quizzes created  ·  **${community.newFans.toLocaleString('en-US')}** new fans`);
  if (duel) desc.push(`Duel verdict: **${duel.winner}** won "${duel.prompt}" with **${duel.votes.toLocaleString('en-US')}** votes`);

  const embed: Record<string, unknown> = {
    title: `K-pop Pulse: ${monthLabel}`,
    description: desc.join('\n'),
    url,
    color: BRAND,
    footer: { text: 'kpopquiz.org · Free to cite with a link' },
    image: { url: ogImage },
  };

  const reddit = buildRedditDraft(payload);
  const content = [
    `**The Monthly K-pop Pulse for ${monthLabel} is live.**`,
    url,
    '',
    'Reddit draft below (owner copies, then posts to r/kpop manually). Spoilered; title is the first line, body follows:',
    `||${reddit.title}`,
    '',
    `${reddit.body}||`,
  ].join('\n');

  return { content, embeds: [embed] };
}

export interface AnnounceResult {
  ok: boolean;
  skipped?: 'webhook_unset' | 'preview' | 'content_too_long';
  status?: number;
  /** Present in preview mode so the caller can inspect the exact message without sending. */
  message?: PulseDiscordMessage;
}

/**
 * Post the Pulse to the flex Discord webhook. Kill-switch: unset env -> skipped
 * (never throws, so generation still succeeds). preview:true builds and returns
 * the message WITHOUT sending, so it can be inspected safely. Reddit is never
 * touched here; the draft only rides along in the Discord message.
 */
export async function announcePulse(payload: PulsePayload, opts: { preview?: boolean } = {}): Promise<AnnounceResult> {
  const message = buildPulseDiscordMessage(payload);
  if (message.content.length > DISCORD_CONTENT_MAX) {
    // Should not happen (top-5 list is bounded), but never post a truncated
    // spoiler that would drop the closing markers.
    return { ok: false, skipped: 'content_too_long', message };
  }
  if (opts.preview) return { ok: true, skipped: 'preview', message };

  const webhook = process.env.DISCORD_FLEX_WEBHOOK_URL;
  if (!webhook) return { ok: false, skipped: 'webhook_unset' };

  try {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...message, allowed_mentions: { parse: [] } }),
    });
    return { ok: r.ok, status: r.status };
  } catch {
    return { ok: false };
  }
}
