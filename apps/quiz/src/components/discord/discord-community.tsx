'use client';

import { useEffect, useState } from 'react';

interface WidgetData {
  online: number | null;
  members: Array<{ username: string; avatar_url: string | null }>;
  invite: string;
  ok: boolean;
}

const DISCORD_ICON = (
  <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
);

// K4 - The on-brand community block (NOT the Discord iframe). Lives on the
// About page as the rich element. The home page renders <DiscordCommunityStrip>
// (a subtler version) below the fold.
export function DiscordCommunity(): React.ReactElement {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    fetch('/api/discord/widget')
      .then((r) => r.json())
      .then((d: WidgetData) => setData(d))
      .catch(() => setData(null));
  }, []);

  // Reserve the count height + avatar row height so async fetch causes no shift.
  const onlineLabel = data?.online != null ? `${data.online.toLocaleString('en-US')} online now` : 'See who’s online';
  const invite = data?.invite ?? 'https://discord.gg/X7AW95WFT?utm_source=discord&utm_medium=site&utm_campaign=community-static';

  return (
    <section className="dc-card" aria-label="Kpop Quiz on Discord">
      <div className="dc-card-head">
        <span className="dc-icon" aria-hidden="true">{DISCORD_ICON}</span>
        <div className="dc-card-meta">
          <p className="dc-card-title">Kpop Quiz on Discord</p>
          <p className="dc-card-sub">Daily quizzes, blindtest games, 88 bias roles. Argue about your bias with real fans.</p>
        </div>
      </div>

      <div className="dc-status" aria-live="polite">
        <span className="dc-dot" aria-hidden="true" />
        <span className="dc-status-text">{onlineLabel}</span>
      </div>

      {data && data.members.length > 0 && (
        <div className="dc-avatars" aria-hidden="true">
          {data.members.map((m, i) => (
            m.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} className="dc-avatar" src={m.avatar_url} alt="" width={32} height={32} loading="lazy" />
            ) : (
              <span key={i} className="dc-avatar dc-avatar-fallback">{m.username.slice(0, 1).toUpperCase()}</span>
            )
          ))}
        </div>
      )}

      <a className="dc-join" href={invite} target="_blank" rel="noopener noreferrer">
        <span className="dc-join-icon" aria-hidden="true">{DISCORD_ICON}</span>
        Join the Discord
      </a>
    </section>
  );
}

// Subtle, single-line home strip (placed below the fold).
export function DiscordCommunityStrip(): React.ReactElement {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    fetch('/api/discord/widget').then((r) => r.json()).then((d: WidgetData) => setData(d)).catch(() => {});
  }, []);

  const onlineLabel = data?.online != null ? `${data.online.toLocaleString('en-US')} fans online now` : 'Join the community';
  const invite = data?.invite ?? 'https://discord.gg/X7AW95WFT?utm_source=discord&utm_medium=site&utm_campaign=home-strip';

  return (
    <a className="dc-strip" href={invite} target="_blank" rel="noopener noreferrer" aria-label="Join the Kpop Quiz Discord community">
      <span className="dc-strip-icon" aria-hidden="true">{DISCORD_ICON}</span>
      <span className="dc-strip-text">
        <span className="dc-strip-title">Kpop Quiz on Discord</span>
        <span className="dc-strip-sub">
          <span className="dc-dot" aria-hidden="true" />
          {onlineLabel}
        </span>
      </span>
      <span className="dc-strip-go" aria-hidden="true">Join &rarr;</span>
    </a>
  );
}
