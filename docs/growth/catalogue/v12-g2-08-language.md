# v12-g2-08-language: one spelling for songs.language (dry-run report)

Generated 2026-10-02T16:34:12.401Z by `apps/quiz/scripts/v12/catalogue/build-language-report.mts` (anon key, nothing written to the database).

## The column today

| language | Songs |
|---|---|
| ko | 156 |
| korean | 3964 |

Rows the file updates ('ko' to 'korean'): 156. Of these, linked to a group today (so shown on a song page): 13.

By act: &TEAM 22, ALLDAY PROJECT 9, Cortis 13, Hearts2Hearts 14, izna 7, KiiiKiii 15, MEOVV 13, NCT WISH 22, QWER 22, UNIS 19.

## Every reader of the column

Command, run on `origin/main` (a94d77c) and on `feat/v12` (the two carry the same code under `apps/quiz`):

```
git grep -n -w "language" <ref> -- apps/quiz/src apps/quiz/scripts
```

139 lines. All but the ones below are the `quizzes.language` field (browse filters, the create funnel, quiz cards, the quiz APIs), the i18n config, CSS, or seed scripts of other tables. The lines that touch `songs.language`:

| File | Line | What it does |
|---|---|---|
| `apps/quiz/src/app/(site)/verse/[slug]/songs/[id]/page.tsx` | 28 | type of the row |
| same | 34 | `.select('id, title, artist_name, album_name, album_cover_medium, album_cover_big, duration, year, language, group_id')` |
| same | 141 | prints it: `{song.language ? <div ...><dt>Language</dt><dd className="font-semibold uppercase text-primary">{song.language}</dd></div> : null}` |
| `apps/quiz/scripts/ingest-blindtest-songs.mts` | 69 (main) | the writer of the 156 `ko` rows; on this branch it writes `korean` |

In SQL (every tracked `.sql` file, searched for `songs` and for `language`): the column is defined once (`language TEXT DEFAULT 'korean'`, the songs table migration, line 25) and is read by no function, view, index, policy or trigger. The migrations named `*_quiz_language` and `*_retag_non_english` are about `quizzes.language`.

So the value is never compared, filtered or joined on: aligning the spelling cannot change a query result. The only visible effect is the "Language" line of a song page.

## The 156 ids (for the undo)

3953618771, 2724546202, 3087528911, 2935382271, 3269045521, 3315036911, 3087528921, 2990968051, 4048845611, 3616742702, 3758369882, 2731900801, 4048845571, 3994187961, 3323050681, 4167424952, 3976692951, 2724546192, 3487140241, 4063736061, 3976692941, 3424456791, 3391965331, 2042306407, 3011497761, 4063736091, 3678754802, 3635091602, 3976692931, 3595814332, 3953618761, 4183906482, 3269045511, 3600774572, 2480160341, 3293899871, 4087604431, 3269045471, 3135697471, 3105346411, 4048845601, 3226704981, 3293899911, 3540344821, 3678754712, 2731900821, 3827175291, 3758369842, 2935382281, 3473951211, 3337521651, 4087604451, 3540344801, 4063736101, 3488151151, 3315036921, 3861932031, 2990968101, 3758369872, 3536330211, 3514913031, 2503980621, 3948103531, 3323050691, 3863988651, 2935382261, 2015550417, 3391965351, 3514912991, 3269045481, 3293899881, 4157164272, 3827375541, 3976692981, 3514913001, 4121008511, 3976692961, 3660524502, 3424456781, 3105346381, 3508191001, 3488151141, 3011497741, 3758369862, 4178804282, 3683657342, 4048845591, 2724546232, 4089668491, 2533931101, 3105346421, 3570119161, 3678754692, 3313211751, 3570464821, 3946155671, 3616742712, 3047609601, 2671407212, 3994187941, 3994187931, 3011497771, 2724546212, 4063736081, 3994187951, 3324968701, 3135697521, 3875168411, 3407280351, 3678754822, 4048845581, 3570464791, 2533931091, 3946155651, 3395330901, 2533931111, 3391965341, 3946155661, 3269045501, 3337521611, 4087604471, 3994187911, 3758369852, 4087604461, 2842874062, 2967825511, 4157164282, 3315036901, 2317353675, 3391965361, 3570464781, 3234208291, 3234208281, 2503980631, 3166346511, 2724546222, 4087604441, 2731900811, 3616742692, 3540344841, 4063736051, 3557694151, 3315036931, 3570464811, 3964491871, 3315036941, 3540344831, 2731900851, 3135697481, 3758369892, 3293899901, 3616742682, 4131564511, 3678754832, 2975720241, 3616742732
