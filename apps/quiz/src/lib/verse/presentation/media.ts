// W-CUSTOM step 6 - parsers/validators for the media modules. Official/allowlisted
// sources only. These produce the iframe src used AFTER a click (the facade never
// requests them on load).

// YouTube: accept watch, youtu.be, embed, shorts. Returns the 11-char id or null.
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1]! : null;
}
export function youtubeEmbed(id: string): string {
  // -nocookie + no autoplay. rel=0 keeps related videos in-channel.
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

// Social: allowlisted official platforms. Handle-level allowlisting needs a per-group
// official-accounts registry (not built - reported); domain-level is enforced here.
const SOCIAL_HOSTS = ['instagram.com', 'www.instagram.com', 'twitter.com', 'x.com', 'youtube.com', 'www.youtube.com', 'youtu.be'];
export interface SocialEmbed { platform: string; iframeSrc: string | null; href: string }
export function parseSocial(url: string): SocialEmbed | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  if (!SOCIAL_HOSTS.includes(host)) return null;
  if (host.endsWith('youtube.com') || host === 'youtu.be') {
    const id = youtubeId(url);
    return id ? { platform: 'youtube', iframeSrc: youtubeEmbed(id), href: url } : null;
  }
  if (host.endsWith('instagram.com')) {
    const m = u.pathname.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
    return m ? { platform: 'instagram', iframeSrc: `https://www.instagram.com/${m[1]}/${m[2]}/embed`, href: url } : null;
  }
  if (host === 'twitter.com' || host === 'x.com') {
    const m = u.pathname.match(/\/status\/(\d+)/);
    // Twitter's iframe embed needs widgets.js; to stay zero-JS we link out instead.
    return m ? { platform: 'x', iframeSrc: null, href: url } : null;
  }
  return null;
}

// Discord: invite must be discord.gg / discord.com/invite. Widget needs a numeric id.
export function validDiscordInvite(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'discord.gg' || h === 'www.discord.gg' || ((h === 'discord.com' || h === 'www.discord.com') && u.pathname.startsWith('/invite/'));
  } catch { return false; }
}
export function discordWidget(serverId: string): string | null {
  return /^\d{5,25}$/.test(serverId) ? `https://discord.com/widget?id=${serverId}&theme=dark` : null;
}
