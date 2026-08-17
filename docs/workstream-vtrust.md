# V-TRUST - the covenant (the moat, made public)

## Claude Code Implementation Prompt

---

Per VERSE-ROADMAP-V3.md (V-TRUST) and the owner-drafted covenant (locked
word-for-word with the owner 2026-08-01). This workstream builds the
public promise page. The covenant TEXT below is FINAL and owner-authored:
render it EXACTLY, do not reword, rephrase, add to, or "improve" a single
sentence. No AI drafting of covenant copy. No money talk anywhere on the
public page (owner decision: we do not discuss ads or payment with fans
now). The supporter-tier proposal is NOT part of this workstream and does
NOT ship to the site (it stays an internal owner-only doc).

Hard rules: NO em dashes (the covenant text is already clean; keep it
that way). Commit per step, do NOT push. No new deps. No migration
expected (STOP if one appears). Dual-skill design. Play triple-proof.

## The locked covenant text (render verbatim)

Title: The KpopVerse promise
Standfirst: A short list of what we owe you, and what we will never do.
We would rather say less and mean all of it.

1. Your work is yours. When you write a page, an essay, a story about
   your group, it stays credited to you. You keep the rights to what you
   make. We are borrowing your words to show them well, not taking them.
2. Your name stays on it. Every page remembers who built it. Curators
   and writers are named, not erased into an anonymous crowd. The fandom
   sees who did the work.
3. You are never locked in. What you write stays yours to keep and
   reuse, wherever you go. We will not hold your work hostage to keep you
   here.
4. If you leave, we will not turn on you. If a community decides to
   build its home elsewhere, we will not fight it, copy it, or bury it
   in search to punish it. We want you here because it is the best place
   to be, not because you are stuck.
5. The facts stay honest. Every fact carries its source. We do not
   invent numbers, we do not fake activity, and we do not write about
   idols' private lives. Real fans, real data, real credit.
6. What we will never do. We will never sell your personal data. We will
   never turn your collections into a marketplace. We will never quietly
   rewrite these promises and hope you do not notice. If this list
   changes, we will say so, out loud.

Signature: Signed, the people building KpopVerse.

## Reword note (owner, 2026-08-01)

Promise 3 was reworded from an export-mechanism claim ("your
contributions are exportable, you can get it out") to a true-today
ownership/no-lock-in statement, because self-service export is not
shipped and is not being built pre-push. The new wording promises no
feature that does not exist. It therefore has NO integrity link-back (and
needs none). If export ships later, this promise only gets stronger.

## Steps

1. THE PROMISE PAGE at /verse/promises (the slug already reserved and
   linked from the Verse footer "Our promises"). Render the covenant
   verbatim on the V-DESIGN system: editorial, calm, generous space, the
   orbit identity, each promise given real weight (this is the most
   important non-content page on the site). Remove the draft/noindex
   state it currently carries: this page is now REAL and SHOULD be
   indexed (it is a trust and SEO asset). Article/WebPage JSON-LD.
   Commit.
2. PLACEMENT: the footer link stays; ADD a prominent entry point in the
   curator recruitment/join flow ("Before you build: here is what we
   promise you") so a recruited curator reads it at the moment of
   deciding. Min-gated nowhere: it always shows. Commit.
3. INTEGRITY LINK-BACKS (make the promises verifiable, not just words):
   where a promise maps to a real shipped feature, link it: "you can
   take it with you" points to the export path; "your name stays on it"
   points to the credited-attribution model; "every fact carries its
   source" points to a sourced page. The covenant proves itself by
   linking to the product keeping it. Commit.
4. STOP: owner review. Matrix: the promise page (desktop + mobile,
   light + dark), the recruitment-flow entry point, the footer link.
5. Closing sweep after approval: dual-skill audit, a11y (headings,
   reading order, contrast), SEO (indexable, JSON-LD, in sitemap, the
   noindex removed), zero money copy on the page (grep), Play
   triple-proof, full build, em-dash grep (the covenant stays clean),
   check:routes. Commit.

## Verify

- [ ] Covenant text renders VERBATIM (diff against this doc: zero word
      changes, zero added sentences, zero AI embellishment)
- [ ] Page is indexable (draft/noindex removed), in the sitemap, JSON-LD
      valid
- [ ] Recruitment/join flow surfaces the covenant before a curator
      commits
- [ ] Integrity link-backs resolve to the real features that keep each
      promise
- [ ] Zero money/ads/payment copy anywhere on the public page (grep)
- [ ] Play triple-proof; tsc/build/routes green; zero em dashes; no new
      deps; no migration

/caveman report per step; step 4 is the owner gate. The words are the
owner's and final: build around them, never over them.
