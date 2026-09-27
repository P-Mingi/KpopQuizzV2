| Spec | Project | Passed | Flaky (passed on retry) | Failed | Skipped |
|---|---|---|---|---|---|
| auth.setup.ts | setup | 1 | 0 | 0 | 0 |
| kit.spec.ts | ux-1440 | 22 | 0 | 0 | 0 |
| kit.spec.ts | ux-390 | 22 | 0 | 0 | 0 |
| p1.spec.ts | ux-1440 | 18 | 0 | 0 | 0 |
| p1.spec.ts | ux-390 | 18 | 0 | 0 | 0 |
| p10.spec.ts | ux-1440 | 42 | 0 | 0 | 0 |
| p10.spec.ts | ux-390 | 42 | 0 | 0 | 0 |
| p11.spec.ts | ux-1440 | 21 | 0 | 0 | 0 |
| p11.spec.ts | ux-390 | 21 | 0 | 0 | 0 |
| p3.spec.ts | ux-1440 | 19 | 0 | 0 | 0 |
| p3.spec.ts | ux-390 | 19 | 0 | 0 | 0 |
| p4.spec.ts | ux-1440 | 22 | 0 | 0 | 1 |
| p4.spec.ts | ux-390 | 23 | 0 | 0 | 0 |
| p5.spec.ts | ux-1440 | 22 | 0 | 0 | 0 |
| p5.spec.ts | ux-390 | 22 | 0 | 0 | 0 |
| p6.spec.ts | ux-1440 | 29 | 0 | 0 | 0 |
| p6.spec.ts | ux-390 | 29 | 0 | 0 | 0 |
| p7.spec.ts | ux-1440 | 17 | 0 | 0 | 0 |
| p7.spec.ts | ux-390 | 17 | 0 | 0 | 0 |
| p8.spec.ts | ux-1440 | 31 | 0 | 0 | 1 |
| p8.spec.ts | ux-390 | 31 | 0 | 0 | 1 |
| p9.spec.ts | ux-1440 | 20 | 0 | 0 | 0 |
| p9.spec.ts | ux-390 | 20 | 0 | 0 | 0 |
| qa-a11y.spec.ts | ux-1440 | 70 | 0 | 18 | 0 |
| qa-a11y.spec.ts | ux-390 | 70 | 0 | 18 | 0 |
| qa-keyboard.spec.ts | ux-1440 | 21 | 0 | 1 | 0 |
| qa-keyboard.spec.ts | ux-390 | 22 | 0 | 0 | 0 |
| shell.spec.ts | ux-1440 | 15 | 0 | 0 | 1 |
| shell.spec.ts | ux-390 | 12 | 0 | 0 | 4 |
| **Total** | | **738** | **0** | **37** | **8** |

Started 2026-09-26T21:02:52.616Z, duration 46 min.

### Failures (37)

- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › quizzes (/quizzes): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | label:nth-child(1) > .fbd-label | label:nth-child(2) > .fbd-label | label:nth-child(3) > .fbd-label | label:nth-child(4) > .fbd-label / expect(received).toEqual(expected) // deep equalit
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › trivia (/blackpink-trivia): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent.transition-colors[href="/"] | .hover\:text-accent.transition-colors[href$="blackpink-quiz"] | .group-updated | time | .btn-outline > span / expect(received).toEqual(expected) // deep equal
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › blindtest-mode (/blindtest/classic): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .mb-6 | .hover\:text-\[var\(--text-secondary\)\] / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › pt (/pt): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .btn-outline | .daily-col > .sec-label | .daily-author | .discord-context-line | .bt-cta-go-label / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › pt-blindtest (/pt/blindtest): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | .bt-kicker | .bt-pick-all-title | .bt-pick-all-sub | .bt-pick-heading:nth-child(1) / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › pt-leaderboard (/pt/leaderboard): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ #main > div > div:nth-child(1) > div | div:nth-child(1) > span | div:nth-child(2) > span | div:nth-child(3) > div:nth-child(3) > span / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › articles (/articles): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ a[href$="who-is-cortis"] > .artx-card-top > .artx-card-cat | a[href$="who-is-cortis"] > .artx-card-top > .artx-card-date | a[href$="who-is-cortis"] > .artx-card-tags > .artx-card-tag:nth-child(1) | a[href$="w
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › article (/articles/best-kpop-quiz-sites-2026): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .art-breadcrumbs > a[href="/"] | .art-breadcrumbs > a[href$="articles"] | .art-category | .art-date | .art-tag:nth-child(1) / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, light › stats (/stats): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .stats-breadcrumbs > a[href="/"] | .stats-breadcrumbs > span:nth-child(3) | .stats-subtitle | .stats-updated | .stats-card:nth-child(1) > .stats-card-label / expect(received).toEqual(expected) // deep equalit
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › quizzes (/quizzes): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | div[aria-label="Filter by language"] > .filter-group-label | a[href$="popular-today"] | .browse-popular-row:nth-child(7) > a[href$="popular-this-week"] | a[href$="popular-this-month"] / 
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › trivia (/blackpink-trivia): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent.transition-colors[href="/"] | .hover\:text-accent.transition-colors[href$="blackpink-quiz"] | .group-updated | time | .btn-outline > span / expect(received).toEqual(expected) // deep equal
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › blindtest-mode (/blindtest/classic): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .mb-6 | .hover\:text-\[var\(--text-secondary\)\] / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › pt (/pt): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .btn-outline | .daily-col > .sec-label | .daily-author | .discord-context-line | .bt-cta-go-label / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › pt-blindtest (/pt/blindtest): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | .bt-kicker | .bt-pick-all-title | .bt-pick-all-sub | .bt-pick-heading:nth-child(1) / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › pt-leaderboard (/pt/leaderboard): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ #main > div > div:nth-child(1) > div | div:nth-child(1) > span | div:nth-child(2) > span | div:nth-child(3) > div:nth-child(3) > span / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › articles (/articles): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ a[href$="who-is-cortis"] > .artx-card-top > .artx-card-cat | a[href$="who-is-cortis"] > .artx-card-top > .artx-card-date | a[href$="who-is-cortis"] > .artx-card-tags > .artx-card-tag:nth-child(1) | a[href$="w
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › article (/articles/best-kpop-quiz-sites-2026): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .art-breadcrumbs > a[href="/"] | .art-breadcrumbs > a[href$="articles"] | .art-category | .art-date | .art-tag:nth-child(1) / serious scrollable-region-focusable: Scrollable region must have keyboard access @
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, light › stats (/stats): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .stats-breadcrumbs > a[href="/"] | .stats-breadcrumbs > span:nth-child(3) | .stats-subtitle | .stats-updated | .stats-card:nth-child(1) > .stats-card-label / expect(received).toEqual(expected) // deep equalit
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › quizzes (/quizzes): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | label:nth-child(1) > .fbd-label | label:nth-child(2) > .fbd-label | label:nth-child(3) > .fbd-label | label:nth-child(4) > .fbd-label / expect(received).toEqual(expected) // deep equalit
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › trivia (/blackpink-trivia): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent.transition-colors[href="/"] | .hover\:text-accent.transition-colors[href$="blackpink-quiz"] | .group-updated | time | .trivia-stat:nth-child(1) > .trivia-stat-label / expect(received).toEq
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › blindtest-mode (/blindtest/classic): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .mb-6 | .hover\:text-\[var\(--text-secondary\)\] / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › pt (/pt): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .daily-col > .sec-label | .daily-reset | .daily-author | .discord-context-line | .bt-cta-go-label / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › pt-blindtest (/pt/blindtest): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | .bt-pick-all-sub | .bt-pick-heading:nth-child(1) | .bt-pick-heading:nth-child(3) | .bt-pick-group > .bt-pick-heading / expect(received).toEqual(expected) // deep equality / - Expected  -
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › pt-leaderboard (/pt/leaderboard): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ #main > div > div:nth-child(1) > div | div:nth-child(1) > span | div:nth-child(2) > span | div:nth-child(3) > div:nth-child(3) > span / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › articles (/articles): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ a[href$="who-is-cortis"] > .artx-card-top > .artx-card-date | a[href$="who-is-cortis"] > .artx-card-tags > .artx-card-tag:nth-child(1) | a[href$="who-is-cortis"] > .artx-card-tags > .artx-card-tag:nth-child(2
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › article (/articles/best-kpop-quiz-sites-2026): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .art-breadcrumbs > a[href="/"] | .art-breadcrumbs > a[href$="articles"] | .art-date | .art-tag:nth-child(1) | .art-tag:nth-child(2) / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-1440] QA axe, guest, dark › stats (/stats): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .stats-breadcrumbs > a[href="/"] | .stats-breadcrumbs > span:nth-child(3) | .stats-subtitle | .stats-updated | .stats-card:nth-child(1) > .stats-card-label / expect(received).toEqual(expected) // deep equalit
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › quizzes (/quizzes): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | div[aria-label="Filter by language"] > .filter-group-label | .grid-full:nth-child(15) > .bg-accent-bg.border-\[1\.5px\].border-dashed > .text-\[15px\].text-accent-hover.font-bold | .grid
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › trivia (/blackpink-trivia): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent.transition-colors[href="/"] | .hover\:text-accent.transition-colors[href$="blackpink-quiz"] | .group-updated | time | .trivia-stat:nth-child(1) > .trivia-stat-label / expect(received).toEq
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › blindtest-mode (/blindtest/classic): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .mb-6 | .px-10 | .hover\:text-\[var\(--text-secondary\)\] / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › pt (/pt): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .daily-col > .sec-label | .daily-reset | .daily-author | .discord-context-line | .bt-cta-go-label / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › pt-blindtest (/pt/blindtest): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .hover\:text-accent | .bt-pick-all-sub | .bt-pick-heading:nth-child(1) | .bt-pick-heading:nth-child(3) | .bt-pick-group > .bt-pick-heading / expect(received).toEqual(expected) // deep equality / - Expected  -
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › pt-leaderboard (/pt/leaderboard): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ #main > div > div:nth-child(1) > div | div:nth-child(1) > span | div:nth-child(2) > span | div:nth-child(3) > div:nth-child(3) > span / expect(received).toEqual(expected) // deep equality / - Expected  -  1
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › articles (/articles): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ a[href$="who-is-cortis"] > .artx-card-top > .artx-card-date | a[href$="who-is-cortis"] > .artx-card-tags > .artx-card-tag:nth-child(1) | a[href$="who-is-cortis"] > .artx-card-tags > .artx-card-tag:nth-child(2
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › article (/articles/best-kpop-quiz-sites-2026): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .art-breadcrumbs > a[href="/"] | .art-breadcrumbs > a[href$="articles"] | .art-date | .art-tag:nth-child(1) | .art-tag:nth-child(2) / serious scrollable-region-focusable: Scrollable region must have keyboard 
- qa-a11y.spec.ts:159 [ux-390] QA axe, guest, dark › stats (/stats): Error: serious color-contrast: Elements must meet minimum color contrast ratio thresholds @ .stats-breadcrumbs > a[href="/"] | .stats-breadcrumbs > span:nth-child(3) | .stats-subtitle | .stats-updated | .stats-card:nth-child(1) > .stats-card-label / expect(received).toEqual(expected) // deep equalit
- qa-keyboard.spec.ts:304 [ux-1440] QA keyboard walk (light) › quizzes (/quizzes): Error: disclosures open with Enter, close with Escape, focus returns / expect(received).toEqual(expected) // deep equality / - Expected  - 1

### Flaky (0)


### Skips (8) by reason

- 1 x p4.spec.ts: phone only
- 2 x p8.spec.ts: this server runs with VERSE_PUBLIC=true: the case above
- 1 x shell.spec.ts: phone only
- 1 x shell.spec.ts: desktop nav
- 3 x shell.spec.ts: desktop widths
