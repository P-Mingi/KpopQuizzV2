// Verse ops alert - reuses the SAME ops webhook + fail-soft pattern as
// lib/industry/alert.ts (one ops channel, not a parallel system), with a verse
// label. Unset webhook = console.error only; post failure is swallowed.
export async function verseAlert(context: string, detail: string): Promise<void> {
  const message = `:warning: [verse/${context}] ${detail}`.slice(0, 1900);
  const webhook = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (!webhook) {
    console.error(`[verse/${context}] ${detail} (no DISCORD_ALERT_WEBHOOK_URL; alert not sent)`);
    return;
  }
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }),
    });
  } catch {
    console.error(`[verse/${context}] ${detail} (alert post failed)`);
  }
}
