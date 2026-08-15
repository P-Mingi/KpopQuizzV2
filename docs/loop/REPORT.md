# REPORT - W2b C1-FIX: the hidden half of the pool, and a second bug behind it

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.
`check:metadata-dupes` not re-run: no page and no metadata changed.

Commit: `116d5b7`. Proofs: `docs/proofs/w2c-supply/`.

**Checkpoint report.** C1-FIX is done and proven. C2, C3 and PART A are not built.

---

## C1-FIX - confirmed to the row, and it was worse than a wrong number

Your finding is exact. I recounted independently before touching anything
(`partC1fix-before.txt`):

```
group          shown today    real open runs    hidden
bts                     49               106        57
blackpink               75               145        70
stray-kids              77               169        92
seventeen               32                64        32
twice                   22                23         1
SITE TOTAL             415               870       455   (52%)

open runs with group_slug NULL but a quiz resolving to a group : 455
open runs attributable to no group at all                      : 0
```

Every hidden run resolves to a group through its quiz. Nothing was genuinely
unattributable, so 52% of the pool was invisible purely because of my filter.

**And you were right that it was worse than a count.** `/api/battle/random` applied the
same `.eq('group_slug', ...)`, so those 455 runs could never be served. They are exactly
the quiz-anchored battles the W2 result-screen challenge creates: we shipped the front
door in W2 and then hid what it produces.

### The fix: one definition, in one place

`lib/db/queries/open-runs.ts` now owns the definition and exports it
(`fetchFinishedGroupBattles`, `playersByBattle`, `isOpenRun`). The draw imports the same
functions. The count and the draw can no longer drift apart, because there is only one
of each. A battle belongs to a group if `group_slug` matches OR its `quiz_id` resolves
through `quizzes.group_id -> groups.slug`; results are deduped by battle id so a battle
carrying both links counts once. Every read paginates, the count stays exact (no cap, no
rounding, no floor), and the min-gate still renders nothing at zero.

### Proof

Rendered on the page vs the independent recount (`partC1fix-after.txt`):

```
group          before    after    independent recount
bts                49      106                    106
blackpink          75      145                    145
stray-kids         77      169                    169
seventeen          32       64                     64
twice              22       23                     23
```

And the runs are now genuinely reachable, not just counted. Ten draws from distinct
callers on `?groupSlug=bts` return a MIX, including `group_slug=NULL` quiz-linked runs
that the old draw could never serve:

```
drew 108ab89e | group_slug=null | quiz=BTS solo era quiz ...
drew 46de14f6 | group_slug=null | quiz=BTS solo era quiz ...
drew 815aa5fc | group_slug=bts  | quiz=(none)
drew bb3c1d39 | group_slug=null | quiz=Ultimate BTS era quiz ...
drew cf265296 | group_slug=bts  | quiz=(none)
```

The bts candidate pool went from 236 to 282 in the draw itself.

---

## A SECOND BUG, found while proving the first

The draw was **fully deterministic**. Ranking is group, then closest score, then most
recent, and it took `open[0]`. So:

- every caller with the same score got the **identical** run, while hundreds sat idle;
- a player who was served a run and did not finish it would be handed the same one
  forever, because C4's "never twice" only excludes runs they actually *played*.

The first six draws in my proof returned the same battle six times, which is what
surfaced it. The draw now samples uniformly from the top-ranked band. That is sampling
**real rows**, spread across them; it invents nothing. It is also the single added
`Math.random` in the diff, quoted in full in `partC1fix-no-fabrication.txt`.

---

## Not built in this run

- **C2 leaderboard "beat this run"**: needs a per-row check for a real open run, with no
  action rendered where none exists.
- **C3 weekly challenge**: targeting, signed-in delivery, rate limit, time-shift copy.
- **PART A**: migration 155 is applied and verified, so it is unblocked. It is the
  largest remaining piece and carries a security requirement (a client passing a foreign
  `anon_id` must be refused), which deserves its own run rather than a rushed tail.

## Deviations and flags (loud)

1. This is my own bug, found by your audit, on code I reported as proven last run. The
   count matched its own definition exactly; the definition was wrong. Worth noting for
   the method: "proven against an independent recount" only proves the arithmetic, not
   the premise, when I write both sides from the same wrong assumption.
2. The deterministic-draw bug existed since W2 PART B and was not in your findings. It
   is fixed here.
3. C1's cost grew: the group page now runs a quiz-id lookup plus two paginated battle
   reads per render. Cached by ISR, but this is now clearly the most expensive thing on
   the page. Denormalising the open count onto `groups` is the obvious next step if
   these pages get hot.
4. C2, C3 and PART A not reached.

## Next

PART A, as its own run.

---

STOP (checkpoint). **Nothing was pushed.** report pret.
