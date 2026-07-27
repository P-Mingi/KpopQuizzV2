// Workstream T1.5: ops alerting for the industry-tracking crons. Posts to a
// SEPARATE ops webhook (DISCORD_ALERT_WEBHOOK_URL), never the community flex
// channel, so a cron failure never shows up in front of fans. Fail-soft: if the
// env is unset the message is only console.error'd. The webhook URL is read
// from env and NEVER logged.

export async function alertOps(context: string, detail: string): Promise<void> {
  const message = `:warning: [industry/${context}] ${detail}`.slice(0, 1900);
  const webhook = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (!webhook) {
    console.error(`[industry/${context}] ${detail} (no DISCORD_ALERT_WEBHOOK_URL; alert not sent)`);
    return;
  }
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }),
    });
  } catch {
    console.error(`[industry/${context}] ${detail} (alert post failed)`);
  }
}
