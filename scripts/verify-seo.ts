// Checks every public route for required SEO elements
// Run with: npx tsx scripts/verify-seo.ts
// Requires the dev server to be running on localhost:3000

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const routes = [
  '/',
  '/trending',
  '/new',
  '/most-liked',
];

async function checkRoute(path: string) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  const html = await res.text();

  const issues: string[] = [];

  // Check title
  if (!html.includes('<title>') || html.includes('<title></title>')) {
    issues.push('Missing or empty <title>');
  }

  // Check meta description
  if (!html.includes('name="description"')) {
    issues.push('Missing meta description');
  }

  // Check OG tags
  if (!html.includes('property="og:title"')) issues.push('Missing og:title');
  if (!html.includes('property="og:description"')) issues.push('Missing og:description');
  if (!html.includes('property="og:image"')) issues.push('Missing og:image');
  if (!html.includes('property="og:url"')) issues.push('Missing og:url');

  // Check Twitter card
  if (!html.includes('name="twitter:card"')) issues.push('Missing twitter:card');

  // Check canonical
  if (!html.includes('rel="canonical"')) issues.push('Missing canonical URL');

  // Check h1
  const h1Match = html.match(/<h1[\s>]/g);
  if (!h1Match) issues.push('Missing <h1>');
  if (h1Match && h1Match.length > 1) issues.push(`Multiple <h1> tags (${h1Match.length})`);

  // Check lang
  if (!html.includes('lang="en"')) issues.push('Missing lang="en" on <html>');

  // Check JSON-LD
  if (!html.includes('application/ld+json')) issues.push('Missing JSON-LD structured data');

  // Report
  if (issues.length === 0) {
    console.log(`  PASS  ${path}`);
  } else {
    console.log(`  FAIL  ${path}`);
    issues.forEach(i => console.log(`   - ${i}`));
  }
}

async function main() {
  console.log(`SEO Verification Report (${BASE_URL})\n`);

  for (const route of routes) {
    await checkRoute(route);
  }

  // Check sitemap
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  if (sitemapRes.ok) {
    const xml = await sitemapRes.text();
    const urlCount = (xml.match(/<url>/g) || []).length;
    console.log(`\n  PASS  Sitemap: ${urlCount} URLs`);
  } else {
    console.log(`\n  FAIL  Sitemap: not accessible (${sitemapRes.status})`);
  }

  // Check robots.txt
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  if (robotsRes.ok) {
    const txt = await robotsRes.text();
    if (txt.includes('Sitemap:')) {
      console.log('  PASS  robots.txt: includes sitemap reference');
    } else {
      console.log('  FAIL  robots.txt: missing sitemap reference');
    }
  } else {
    console.log('  FAIL  robots.txt: not accessible');
  }

  // Check OG image endpoint
  const ogRes = await fetch(`${BASE_URL}/api/og/test-slug`);
  console.log(`  ${ogRes.status === 404 ? 'PASS' : ogRes.ok ? 'PASS' : 'FAIL'}  OG image endpoint: ${ogRes.status}`);

  console.log('\nDone.');
}

main().catch(console.error);
