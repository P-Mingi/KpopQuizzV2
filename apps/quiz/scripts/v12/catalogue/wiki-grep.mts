// Print the sentences of English Wikipedia articles that match a pattern (read-only HTTP GETs).
//   npx tsx scripts/v12/catalogue/wiki-grep.mts "lead single|title track" Hearts2Hearts KickFlip
// Used to find the sentence a title-track citation quotes; the citation itself is then checked on
// the rendered page by verify-source.mts.
const [pattern, ...pages] = process.argv.slice(2);
if (!pattern || !pages.length) { console.error('usage: wiki-grep.mts <regex> <Page>...'); process.exit(2); }
const re = new RegExp(pattern, 'i');
for (const p of pages) {
  const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(p)}&action=raw`, { headers: { 'user-agent': 'kpopquiz-catalogue-check/1.0' } });
  const text = (await res.text()).replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '');
  console.log(`=== ${p} (${res.status})`);
  for (const s of text.split(/(?<=[.!?])\s+|\n/)) if (re.test(s) && s.length < 500) console.log(`  ${s.trim()}`);
}
