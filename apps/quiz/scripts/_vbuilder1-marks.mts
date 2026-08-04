// V-BUILDER-1 step 4 proof (throwaway): the six text marks are PRESENTATIONAL - the
// same text stays indexable - and the SSR renderer/sanitizer CLAMPS hostile values.
//   pnpm -C apps/quiz exec tsx scripts/_vbuilder1-marks.mts
import { renderTipTapJSON } from '../src/lib/verse/render-content';

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2, textAlign: 'center' }, content: [{ type: 'text', text: 'STAY' }] },
    { type: 'paragraph', attrs: { textAlign: 'center' }, content: [
      { type: 'text', text: 'Eight members', marks: [{ type: 'bold' }, { type: 'underline' }, { type: 'highlight', attrs: { tint: 'yellow' } }, { type: 'fontSize', attrs: { size: 'L' } }] },
      { type: 'text', text: ', one fire' },
      { type: 'text', text: ' forever', marks: [{ type: 'strike' }] },
    ] },
  ],
};

// The SAME doc with every mark + alignment stripped: the parity baseline. If the
// marks are purely presentational, the two renders have identical indexable text.
type N = { type?: string; content?: N[]; text?: string; marks?: unknown[]; attrs?: Record<string, unknown> };
const stripMarks = (n: N): N => {
  const { marks, attrs, content, ...rest } = n;
  const cleanAttrs = attrs ? Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'textAlign')) : undefined;
  return { ...rest, ...(cleanAttrs ? { attrs: cleanAttrs } : {}), ...(content ? { content: content.map(stripMarks) } : {}) };
};
const textOf = (h: string) => h.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const html = renderTipTapJSON(doc);
const stripped = textOf(html);
const plainWanted = textOf(renderTipTapJSON(stripMarks(doc as N)));

// A hostile doc: raw hex tint, free-px size, unknown align - all must be clamped away.
const hostile = renderTipTapJSON({ type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: 'justify' }, content: [{ type: 'text', text: 'x', marks: [{ type: 'highlight', attrs: { tint: '#ff0000' } }, { type: 'fontSize', attrs: { size: '999px' } }] }] }] });

const textParity = stripped === plainWanted;
const marksPresent = /<u>/.test(html) && /<s>/.test(html) && /<strong>/.test(html) && /verse-hl-yellow/.test(html) && /verse-size-L/.test(html) && /verse-align-center/.test(html);
const clamped = !/#ff0000/.test(hostile) && !/999px/.test(hostile) && !/verse-align-justify/.test(hostile) && /verse-hl-yellow/.test(hostile) && /verse-size-M/.test(hostile);

console.log(`${textParity ? 'PASS' : 'FAIL'}  published parity: indexable text unchanged by marks`);
if (!textParity) console.log(`   got:  "${stripped}"\n   want: "${plainWanted}"`);
console.log(`${marksPresent ? 'PASS' : 'FAIL'}  marks render as presentational wrappers (u/s/strong/mark/size/align)`);
console.log(`${clamped ? 'PASS' : 'FAIL'}  sanitizer clamps hostile tint/size/align (no raw hex/px/unknown align leaks)`);
console.log('\n--- rendered HTML ---\n' + html);
process.exit(textParity && marksPresent && clamped ? 0 : 1);
