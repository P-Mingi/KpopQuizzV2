// Line-level visual diff between two editor snapshots. Content sections are
// small, so a plain LCS diff is fine. Each block (paragraph/heading/list item/
// quote/cell) becomes one line; the diff marks lines added / removed / unchanged.
interface Node { type?: string; content?: Node[]; text?: string; attrs?: Record<string, unknown> }

function plain(n: Node): string {
  if (n.type === 'text') return n.text ?? '';
  return (n.content ?? []).map(plain).join('');
}

/** Flatten a document into diffable lines (one per block), with a light prefix. */
export function toLines(doc: unknown): string[] {
  const out: string[] = [];
  const walk = (n: Node): void => {
    switch (n.type) {
      case 'heading': out.push(`${'#'.repeat(Number(n.attrs?.level) === 3 ? 3 : 2)} ${plain(n)}`); return;
      case 'paragraph': { const t = plain(n).trim(); if (t) out.push(t); return; }
      case 'listItem': out.push(`- ${plain(n).trim()}`); return;
      case 'blockquote': out.push(`> ${plain(n).trim()}`); return;
      case 'verseEmbed': out.push(`[embed: ${String(n.attrs?.kind ?? '')} ${String(n.attrs?.group ?? '')}]`); return;
      case 'horizontalRule': out.push('---'); return;
      default: (n.content ?? []).forEach(walk);
    }
  };
  if (doc && typeof doc === 'object') walk(doc as Node);
  return out;
}

export interface DiffLine { type: 'same' | 'add' | 'del'; text: string; }

/** Classic LCS line diff. */
export function diffLines(aDoc: unknown, bDoc: unknown): DiffLine[] {
  const a = toLines(aDoc), b = toLines(bDoc);
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  }
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: 'same', text: a[i]! }); i++; j++; }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) { out.push({ type: 'del', text: a[i]! }); i++; }
    else { out.push({ type: 'add', text: b[j]! }); j++; }
  }
  while (i < n) out.push({ type: 'del', text: a[i++]! });
  while (j < m) out.push({ type: 'add', text: b[j++]! });
  return out;
}
