## What this PR does

The owner cannot reach the Mac, so the card files (lot 7: thirds, panoramas) and the Kpopdle idol photos can now be published from GitHub
Actions, by hand only, behind an environment with a required reviewer. Nothing runs on a push or a pull request. Merging this PR publishes
nothing: a run starts only when the owner clicks "Run workflow" and approves it.

1. **`.github/workflows/cards-publish.yml`**
   - **Trigger and limits**: `workflow_dispatch` only (never `push`, `pull_request` or `pull_request_target`), `permissions: contents: read`,
     the environment `cards-publish`, 300 minutes at most, Node 22, `pnpm install --frozen-lockfile`.
   - **Inputs**: `host` and `kpopdle` (non or oui, non by default).
   - **First step**, before anything is sent:
     - the host must be exactly `rdkgouofytwfdpbxbzio.supabase.co`;
     - the run must start from `main`;
     - the environment must hold the secret `SUPABASE_SERVICE_ROLE_KEY`.
   - **The secret** reaches the two publish steps through their environment only. It is never on a command line, and no shell line contains an
     input or a secret (a test checks it).
   - **Then**:
     1. the card files, with `publish-card-files.mjs --publish --non-interactive --keep-going`;
     2. the Kpopdle idol photos (`kpopdle-photos.mjs --publish`) when `kpopdle` is oui;
     3. the summary of the job;
     4. the job ends red if a photo failed.
   - **The cache**: the Commons originals are restored at the start and saved even when photos failed, so a new run downloads only what is
     missing.
   - **A first**: tests.yml and seo-gates.yml keep the anon key only. This is the first workflow that takes a service key to a runner, and only after
     the reviewer's approval.
2. **`publish-card-files.mjs`**: new options; the owner's interactive mode is unchanged (all its source checks still pass).
   - `--non-interactive --host <host>`: nothing is typed, no terminal. The host must be the host of `CARDS_SUPABASE_URL`, else nothing is
     sent. The key comes from `CARDS_SERVICE_KEY` only. The cleanup lists and never deletes.
   - `--keep-going` (either mode): a photo whose original fails is skipped and listed with its reason, and the run goes on. A failure here means:
     - the download failed after its tries;
     - the Commons file changed (another sha1);
     - the image cannot be read.

     The failed photo's row stays unchanged, and the run then ends with exit code 2.

     A refusal of Supabase still stops the run (exit 1), because it would fail for every photo.
   - **Download tries**: a Commons download is tried up to 3 times, on a timeout, the rate limit or a busy server. The wait is the server's
     `Retry-After` (at most 60 s), else 5 s, then 20 s. A 404 is not tried again.
   - `--cache-dir <folder>`: one original per recorded sha1.
   - `--report <file.json>`: the counts (photos, cards, panoramas), the failed photos and why, the cleanup's counts. It is written at the end
     and when the run stops.
   - **Key masking**: a message that would carry the key (an error body echoing a header) shows `[redacted]`.
3. **`publish-summary.mjs`**: the job summary (`GITHUB_STEP_SUMMARY`):
   - photos, cards and panoramas published;
   - the failed photos, each with its Commons page and its reason;
   - the cleanup's counts;
   - the Kpopdle idols given a photo, the errors, the idols without one.

## For the owner

Once:

1. Merge this PR.
2. github.com, the repository, **Settings**, **Environments**, **New environment**, name `cards-publish`, then:
   - **Required reviewers**: tick it and add yourself, then **Save protection rules**. Every run then waits for your approval before it gets
     the secret.
   - **Deployment branches and tags**: **Selected branches and tags**, add `main`.
   - **Environment secrets**, **Add environment secret**: name `SUPABASE_SERVICE_ROLE_KEY`, value the service key of the project
     `rdkgouofytwfdpbxbzio` (Supabase, Project Settings, API Keys). Paste it there only, never in a file, an issue or a chat.

   Create the environment before the first run. A run that names an environment that does not exist creates it empty, with no reviewer
   and no secret. That run stops at its first step ("no secret SUPABASE_SERVICE_ROLE_KEY") with nothing sent, but create it first anyway.

Each time:

3. **Actions**, **Cards publish**, **Run workflow**: branch `main`, host `rdkgouofytwfdpbxbzio.supabase.co` (typed exactly), kpopdle `oui`
   or `non`, **Run workflow**.
4. The run waits: open it, **Review deployments**, tick `cards-publish`, **Approve and deploy**.
5. At the end, the run's page shows the summary.
   - **Red because some photos failed**: the others are published. Run it again later: only the failed ones are tried, and the downloads
     already made come from the cache.
   - **Red because of a "Stopped:" line**: nothing after that line was done. Tell Claude the line.
6. The cleanup only lists the files that are no longer used. To delete them, run the script by hand in a terminal one day; it asks you to type
   `delete`.

## Checks

- New tests:
  - `publish-noninteractive.test.ts` runs the real script without a terminal against a local server that plays Commons and the project.
    It checks the uploads, the PATCHes, the panoramas, a changed sha1, a 404, a 503 then OK, exit code 2, the cleanup that never deletes,
    the report, the cache on a second run, the refusals with nothing sent, the stop without `--keep-going`, and the key masked when an answer
    echoes it.
  - `publish-summary.test.ts` covers the summary and the retry rule.
  - `cards-publish-workflow.test.ts` covers the workflow file, read as text: the trigger, the permissions, the environment, the limits, the
    host check, no input or secret in a shell line, the step order, the cache.
- The cards, dle and kpopcards suites and `tsc --noEmit`: green.
- No key in the repository: the tests use a made-up value. No em or en dash in the diff. No new dependency.
- Exact test values: none changed. The source checks of `owner-cards.test.ts` and `card-files.test.ts` on the script still pass as they
  were.

Not merged: the owner merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
