const [u] = process.argv.slice(2);
const get = async (b) => (await fetch(b + u)).text();
const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const [a, b] = await Promise.all([get('http://localhost:3042'), get('http://localhost:3032')]);
const A = lds(a), B = lds(b);
for (const t of ['BreadcrumbList', 'FAQPage', 'ItemList', 'Organization', 'SiteNavigationElement']) {
  const x = A.find((j) => j['@type'] === t), y = B.find((j) => j['@type'] === t);
  const same = JSON.stringify(x) === JSON.stringify(y);
  console.log(t, same ? 'SAME' : 'DIFF');
  if (!same && t === 'ItemList') {
    const ia = x.itemListElement.map((i) => i.url.split('/q/')[1]), ib = y.itemListElement.map((i) => i.url.split('/q/')[1]);
    console.log(' count', ia.length, ib.length, 'same set', ia.every((s) => ib.includes(s)) && ib.every((s) => ia.includes(s)));
    ia.forEach((s, i) => { if (s !== ib[i]) console.log('  pos', i + 1, s, '|', ib[i]); });
  }
}
