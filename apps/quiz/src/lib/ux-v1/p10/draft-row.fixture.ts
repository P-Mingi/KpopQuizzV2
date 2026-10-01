// P10: the exact server-free markup of <DraftRow> for the prototype's sample draft.
// passport-render.test.ts asserts that the component renders THIS string, and the
// e2e (e2e/ux-v1/p10.spec.ts, as a guest on a flag-on page with the real v11 CSS)
// places it in a Quizzes list to measure it against the prototype's draft row.
// The /me Quizzes tab itself is never loaded signed in (it writes on view).
// No imports on purpose: Playwright loads this file as plain TypeScript.

export const DRAFT_ROW_SAMPLE = { title: 'Stray Kids b-sides deep cut', line: 'Draft · 4 of 10 questions · edited 2 days ago' } as const;

export const DRAFT_ROW_HTML =
  '<a class="ux-row p10-draft" href="/create">'
  + '<span class="ux-thumb is-glyph" aria-hidden="true"><svg class="ux-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg></span>'
  + '<span class="ux-row-grow"><span class="ux-rt">Stray Kids b-sides deep cut</span><span class="ux-rs">Draft · 4 of 10 questions · edited 2 days ago</span></span>'
  + '<span class="ux-btn ux-btn-ghost ux-btn-sm">Continue</span>'
  + '</a>';
