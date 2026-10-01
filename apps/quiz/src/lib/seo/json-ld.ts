// The one serializer for inline `<script type="application/ld+json">` blocks.
//
// A bare JSON.stringify is unsafe inside a script tag: a user-written string (a
// quiz title, a username, a thread title) containing `</script>` closes the tag
// and whatever follows runs as HTML. Writing `<`, `>` and `&` as JSON unicode
// escapes keeps the text valid JSON that parses back to the same value, and
// U+2028 / U+2029 are escaped because they end a line in older JS parsers.
// Every ld+json block of the app goes through this (json-ld.test.ts scans for
// a bare JSON.stringify next to dangerouslySetInnerHTML).
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
