import { ClickToLoad } from './click-to-load';
import { AudioStrip } from './audio-strip';
import { youtubeId, youtubeEmbed, parseSocial, validDiscordInvite, discordWidget } from '@/lib/verse/presentation/media';
import { isConfiguredImageHost } from '@/lib/image-hosts';

import type { ModuleProps } from './module-registry';

// V-DESIGN v2 - borderless editorial block (matches the rest of the module system).
function Card({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="v-module">
      <h3 className="v-eyebrow">{title}</h3>
      {children}
    </div>
  );
}

function okTracks(raw: unknown): { title: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (t && typeof t === 'object' ? { title: String((t as Record<string, unknown>).title ?? ''), url: String((t as Record<string, unknown>).url ?? '') } : null))
    .filter((t): t is { title: string; url: string } => !!t && isConfiguredImageHost(t.url))
    .slice(0, 12);
}

/** MUSIC - one mode per instance, all click-to-play, official/allowlisted only. */
export function MusicModule({ placement }: ModuleProps): React.ReactElement | null {
  const p = placement.props ?? {};
  const mode = String(placement.mode ?? p.mode ?? 'youtube');

  if (mode === 'youtube') {
    const raw = String(p.videoId ?? p.url ?? '');
    const id = /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : youtubeId(raw);
    if (!id) return null;
    return <Card title="Music"><ClickToLoad iframeSrc={youtubeEmbed(id)} iframeTitle="YouTube video" allow="encrypted-media; picture-in-picture; fullscreen" label="Play video" /></Card>;
  }
  if (mode === 'audio' || mode === 'signature') {
    const url = String(p.audioUrl ?? '');
    if (!isConfiguredImageHost(url)) return null;
    return <Card title={mode === 'signature' ? 'Signature sound' : 'Music'}><AudioStrip tracks={[{ title: String(p.title ?? 'Listen'), url }]} compact={mode === 'signature'} /></Card>;
  }
  if (mode === 'playlist') {
    const tracks = okTracks(p.tracks);
    if (!tracks.length) return null;
    return <Card title="Playlist"><AudioStrip tracks={tracks} /></Card>;
  }
  return null;
}

/** SOCIAL EMBED - one official post, click-to-load (facade -> iframe on click, or a
 * link-out where no zero-JS iframe exists). Zero third-party requests on load. */
export function SocialEmbedModule({ placement }: ModuleProps): React.ReactElement | null {
  const url = String(placement.props?.url ?? '');
  const s = parseSocial(url);
  if (!s) return null;
  if (s.iframeSrc) {
    return <Card title="Latest post"><ClickToLoad iframeSrc={s.iframeSrc} iframeTitle={`${s.platform} post`} aspect="1 / 1" label={`${s.platform} post`} /></Card>;
  }
  // No zero-JS iframe (e.g. X): a facade that links out, no third-party on load.
  return (
    <Card title="Latest post">
      <a href={s.href} target="_blank" rel="noopener noreferrer nofollow"
        className="flex items-center justify-center gap-2 rounded-lg border py-6 text-sm font-semibold no-underline"
        style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>
        View the {s.platform} post
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </a>
    </Card>
  );
}

/** DISCORD (W-DISCORD-lite) - invite link (validated) + optional click-to-load widget. */
export function DiscordModule({ placement }: ModuleProps): React.ReactElement | null {
  const invite = String(placement.props?.invite ?? '');
  const serverId = String(placement.props?.serverId ?? '');
  const validInvite = validDiscordInvite(invite);
  const widget = serverId ? discordWidget(serverId) : null;
  if (!validInvite && !widget) return null;
  return (
    <Card title="Discord">
      {widget ? <div className="mb-3"><ClickToLoad iframeSrc={widget} iframeTitle="Discord widget" aspect="3 / 4" label="Discord widget" /></div> : null}
      {validInvite ? (
        <a href={invite} target="_blank" rel="noopener noreferrer nofollow"
          className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold no-underline"
          style={{ background: 'var(--verse-accent)', color: 'var(--verse-accent-text)' }}>
          Join the Discord
        </a>
      ) : null}
    </Card>
  );
}
