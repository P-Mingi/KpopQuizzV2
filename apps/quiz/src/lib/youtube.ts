export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1]! : null;
}

export function parseYouTubeTitle(raw: string): { title: string; artist: string } {
  let cleaned = raw
    .replace(/\(official\s*(music\s*)?video\)/gi, '')
    .replace(/official\s*(mv|m\/v|music\s*video)/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?[\uAC00-\uD7AF].*?\)/g, '')
    .trim();

  const dashMatch = cleaned.match(/^(.+?)\s*[-]\s*(.+)/);
  if (dashMatch) {
    return { artist: dashMatch[1]!.trim(), title: dashMatch[2]!.replace(/['"]/g, '').trim() };
  }

  const quoteMatch = cleaned.match(/'([^']+)'/);
  if (quoteMatch) {
    return { artist: cleaned.replace(`'${quoteMatch[1]}'`, '').trim(), title: quoteMatch[1]! };
  }

  return { artist: '', title: cleaned };
}

export function thumbnailUrl(videoId: string, quality: 'hq' | 'default' = 'hq'): string {
  if (quality === 'hq') return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return `https://img.youtube.com/vi/${videoId}/default.jpg`;
}
