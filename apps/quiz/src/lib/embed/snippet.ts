// W4 - the paste snippet (docs/WIDGET-EMBED-SPEC.md section 6).
//
// THE WHOLE POINT: the visible <a> above the iframe. An <iframe src> passes almost no
// link equity, so that anchor is the only part of this block that builds authority.
// It is generated FIRST, outside the iframe, in the partner's own DOM, and the
// generator has no option to omit it. A widget without it is a traffic toy.
//
// The anchor text is the quiz title plus "on kpopquiz.org": descriptive and natural,
// never exact-match keyword stuffing, which is what gets links discounted.
//
// The snippet is dependency-free: six lines of listener, no resizer library dragged
// into someone else's page. If a CMS strips the <script>, the iframe still renders at
// its min-height AND the backlink still stands, because the link is not inside the
// script or the frame.

export interface SnippetInput {
  slug: string;
  title: string;
  /** Short partner key, e.g. 'nolae'. Used for utm + embed attribution only. */
  partner: string;
  theme?: 'light' | 'dark';
  origin?: string;
}

/** Only [a-z0-9-], so a partner key can never break out of the URL or the HTML. */
export function sanitizePartner(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildEmbedSnippet({
  slug,
  title,
  partner,
  theme = 'light',
  origin = 'https://kpopquiz.org',
}: SnippetInput): string {
  const p = sanitizePartner(partner) || 'partner';
  const safeTitle = escapeHtml(title);
  const linkHref = `${origin}/q/${slug}?utm_source=${p}&utm_medium=embed&utm_campaign=widget`;
  const frameSrc = `${origin}/embed/q/${slug}?partner=${p}&theme=${theme}`;

  return `<!-- kpopquiz.org quiz embed -->
<div class="kpopquiz-embed-wrap" style="max-width:680px;margin:24px auto;">
  <p style="font:14px/1.4 sans-serif;margin:0 0 8px;">
    Quiz: <a href="${linkHref}">${safeTitle} on kpopquiz.org</a>
  </p>
  <iframe
    id="kpopquiz-embed"
    src="${frameSrc}"
    title="${safeTitle} - K-pop quiz"
    loading="lazy"
    style="width:100%;min-height:420px;border:0;display:block;"
    referrerpolicy="no-referrer-when-downgrade"></iframe>
  <script>
    window.addEventListener('message',function(e){
      if(e.origin!=='${origin}')return;
      if(e.data&&e.data.type==='kpopquiz:resize'){
        var f=document.getElementById('kpopquiz-embed');
        if(f)f.style.height=e.data.height+'px';
      }
    });
  </script>
</div>`;
}
