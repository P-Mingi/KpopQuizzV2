// P8 editor drafts: validation (mirrors the limits of the routes they post to) and
// the plain-text to TipTap conversion for blogs (the essays route stores TipTap
// JSON; lib/verse/render-content renders only this node set, escaped). Pure.

export type EditorMode = 'thread' | 'blog' | 'debate' | 'challenge';

export interface Draft {
  mode: EditorMode;
  groupId: number | null;
  title: string;
  body: string;
  question: string;
  options: string[];
  days: '1' | '3' | '7';
  playId: string | null;
  message: string;
}

export type DraftErrors = Partial<Record<'groupId' | 'title' | 'body' | 'question' | 'options' | 'playId' | 'form', string>>;

/** Same limits as the endpoints: threads 140 / 2000 (app/api/verse/threads), essays
 *  160 title (app/api/verse/essays), fan debates 5 to 160 + 2 to 4 options of 80
 *  (api/ux-v1/p8/debates), challenge message 280. */
export function validateDraft(d: Draft): DraftErrors {
  const e: DraftErrors = {};
  if (d.mode !== 'challenge' && !d.groupId) e.groupId = 'Pick a group.';
  if (d.mode === 'thread') {
    if (!d.title.trim()) e.title = 'Add a title first.';
    else if (d.title.trim().length > 140) e.title = 'Keep the title under 140 characters.';
    if (d.body.trim().length > 2000) e.body = 'Keep the text under 2,000 characters.';
  }
  if (d.mode === 'blog') {
    if (!d.title.trim()) e.title = 'Add a title first.';
    else if (d.title.trim().length > 160) e.title = 'Keep the title under 160 characters.';
    if (!d.body.trim()) e.body = 'Write the blog first.';
  }
  if (d.mode === 'debate') {
    const q = d.question.trim();
    if (!q) e.question = 'Add your question first.';
    else if (q.length < 5 || q.length > 160) e.question = 'Use 5 to 160 characters.';
    const opts = d.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) e.options = 'Add at least two options.';
    else if (opts.some((o) => o.length > 80)) e.options = 'Keep each option under 80 characters.';
    else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) e.options = 'Each option must be different.';
  }
  if (d.mode === 'challenge') {
    if (!d.playId) e.playId = 'Pick the score to beat.';
    if (d.message.trim().length > 280) e.form = 'Keep the message under 280 characters.';
  }
  return e;
}

interface TextNode { type: 'text'; text: string }
interface BreakNode { type: 'hardBreak' }
interface ParaNode { type: 'paragraph'; content?: Array<TextNode | BreakNode> }

/** Blank lines split paragraphs, single newlines become hard breaks. */
export function draftToDoc(text: string): { type: 'doc'; content: ParaNode[] } {
  const paras = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return {
    type: 'doc',
    content: paras.map((p): ParaNode => {
      const lines = p.split('\n');
      const content: Array<TextNode | BreakNode> = [];
      lines.forEach((l, i) => {
        if (i > 0) content.push({ type: 'hardBreak' });
        if (l) content.push({ type: 'text', text: l });
      });
      return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
    }),
  };
}
