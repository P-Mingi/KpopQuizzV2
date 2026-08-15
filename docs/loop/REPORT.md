# REPORT - W3 PART A: identity, and the refusal that makes it safe

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.
`check:metadata-dupes` not re-run: no page and no metadata changed.

Commit: `c62c00f`. Proofs: `docs/proofs/w3-partA/`.

---

## 1. THE SECURITY PROOF (first, as ordered)

A body field is a claim, not a proof. If the client could simply name an `anon_id`,
anyone could type a stranger's and take their runs.

So the server mirrors every browser id it sees **on a write** into an httpOnly
`nq_anon` cookie that JS cannot read or forge. The claim endpoint trusts only that
cookie, and refuses outright when the body names something else rather than quietly
falling back to the cookie (a silent fallback would let the attack "succeed" from the
attacker's point of view, which is worse than a refusal).

```
POST /api/claim-runs  {"anonId":"096e0ac1-...")   <- an id this browser never proved
  -> 403 {"error":"anon_id_mismatch",
          "detail":"The browser id supplied does not match this browser."}

POST /api/claim-runs  {"anonId":"a660fc15-..."}   <- the id this browser proved
  -> 200 {"claimed":{"plays":1,"battles":1}}
```

The refused call created and moved nothing: rows carrying the foreign id remain **0**.

## 2. Rows before and after: only this browser's runs moved

```
BEFORE   plays          with anon_id A: 1   owned 0   unowned 1
         battle_results with anon_id A: 1   owned 0   unowned 1

AFTER    plays          with anon_id A: 1   owned 1 -> 67358f12-...
         battle_results with anon_id A: 1   owned 1 -> 67358f12-...
         rows carrying the FOREIGN id : 0
```

## 3. Already-owned rows are untouchable

The claim filters `.is('player_id', null)` / `.is('user_id', null)`, so a run that
already belongs to somebody can never be re-owned. Counted live: 1 play carries an
anon_id and already has an owner, and it is outside the claim's reach by construction.

## 4. Idempotency

```
second identical claim -> 200 {"claimed":{"plays":0,"battles":0}}
```

Nothing duplicated, nothing stolen: the second pass finds no NULL-owner rows left.

## 5. It works from a battle, not only a quiz

The same browser recorded a battle result (battle `47ce6d49`), and the claim moved
both the play and the battle row. That is the point of doing it from a battle: it turns
an anonymous challenger into someone who can be told their run was beaten, which is
what migration 154 unlocked.

## 6. The copy, legible rather than asserted

`partA-claim-mobile-390.png` and `partA-claim-desktop.png`:

> **This run counts either way.**
> Sign in and it takes your name, along with the runs you make from this browser from
> now on. No email needed.
> [ Claim your spot ]
> Your score is saved whether you do this or not.

No "recover your history", no "get your past scores back". It cannot say those things,
because **36,159 guest plays carry no anon_id and can never be claimed**. That number is
in the proof file next to the copy.

## 7. Nothing is gated on identity

```
play WITH anon_id    -> 200 play_id 26dd47f4...
play with NO anon_id -> 200 play_id bace59ab...
```

Private mode, storage blocked, or an older client: the run is written with `anon_id`
NULL exactly as before, and the claim block simply does not render.

## 8. Covenant

Zero added lines matching fake / synthetic / dummy / mock / placeholder /
`Math.random`. `player_hash` appears zero times in the added code: it is for battle
pairing only, and using it to claim would hand over strangers' runs (199 hashes cover
more than one run, the largest covers 15).

---

## How it is wired

- `lib/anon-id.ts` (client): random UUID per browser in localStorage. Not derived from
  IP, user agent, or anything about the device.
- `lib/anon-claim.ts` (server): the `nq_anon` httpOnly cookie, plus UUID validation.
- Write paths stamping `anon_id` and setting the cookie: `/api/quiz/[id]/play` (after
  `record_play`, which returns `play_id`, so no DDL and no change to the RPC),
  `/api/battle/[id]/result`, `/api/battle/challenge`.
- `/api/claim-runs`: service-role write, cookie-only trust, NULL-owner filter, rate
  limited per user.
- `components/quiz/claim-run.tsx` mounted on the quiz result and the battle reveal.

## Deviations and flags (loud)

1. **Guest plays are stamped only when the player is signed out.** A signed-in play
   already has an owner and nothing to claim, so stamping it would store a browser id
   against a named account for no benefit. Deliberate.
2. **The rate limiter is in-process** (a Map, bounded and cleared). It does not survive
   a restart and is per-instance. Fine for a guard on an idempotent endpoint; say the
   word if you want it in the DB.
3. **The claim needs the cookie**, so a browser that played before this shipped has no
   proof and gets `{"claimed":{...0},"reason":"no_browser_id"}` until it writes one run.
   Honest and unavoidable.
4. `signedIn` on the quiz result is inferred from `profileXp !== null`, the existing
   pattern on that screen. There is no auth hook in this app.
5. The proof used the dev-login route for a real session. It is double-gated
   (NODE_ENV + DEV_LOGIN_ENABLED) and cannot run in production.

## Next

C2 (leaderboard "beat this run") and C3 (weekly challenge). C3 is now genuinely
deliverable: 154 is live and, from here, challengers can have names.

---

STOP. **Nothing was pushed.** report pret.
