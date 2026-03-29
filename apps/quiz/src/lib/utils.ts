const AVATAR_COLORS = [
  { bg: '#EEEDFE', text: '#3C3489' }, // purple
  { bg: '#E1F5EE', text: '#085041' }, // teal
  { bg: '#FAECE7', text: '#712B13' }, // coral
  { bg: '#FBEAF0', text: '#72243E' }, // pink
  { bg: '#E6F1FB', text: '#0C447C' }, // blue
  { bg: '#FAEEDA', text: '#633806' }, // amber
  { bg: '#EAF3DE', text: '#27500A' }, // green
  { bg: '#FCEBEB', text: '#791F1F' }, // red
] as const;

export function getAvatarColors(username: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index]!;
}

export function getAvatarInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatJoinDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}
