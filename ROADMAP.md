<!-- LOADS: every planning session AND every autonomous loop iteration (to pick the next task).
     LOADED BY: the executing agent each iteration; human for sequencing.
     RULE: if an AC can't be command + expected output, the task isn't autonomously done-able —
     split/reword it or mark SUPERVISED.
     SHELL RULE (gate critique #9): ALL ACs run under Git Bash — never PowerShell-verbatim.
     Map/data stack: ADR-0004 is the single source of truth. -->

# Rent-Yield Screener — Roadmap

## Phase A — Walking Skeleton (IN PROGRESS)

**Exit condition:** hello-world live at a public URL; `gh run list` (or Actions tab) shows green CI on latest push to main.

- [ ] **Task A.1 — Astro scaffold + repo hygiene**
  - AC: `npm run build` → exits 0, `dist/index.html` exists
  - AC: `npm test` → exits 0 (placeholder test passes)
- [ ] **Task A.2 — CI pipeline (typecheck + lint + test on push)**
  - AC: `git push` → GitHub Actions run completes green (screenshot or `gh run view` output)
- [ ] **Task A.3 — Cloudflare Pages deploy** (SUPERVISED — needs Mekyle's CF account auth)
  - AC: `curl -s -o /dev/null -w "%{http_code}" https://<project>.pages.dev` → `200`

## Phase B — ETL Pipeline (deterministic core)

**Exit condition:** full pipeline runs on frozen fixtures in CI; re-run produces byte-identical output.

- [ ] **Task B.1 — Fetch + freeze fixture snapshots** (ZHVI ZIP+metro, ZORI ZIP+metro; committed test fixtures)
  - AC: `npm run etl:fetch -- --dry-run` → lists 4 source URLs, exits 0
  - AC: `ls tests/fixtures/*.csv | wc -l` → `4` (trimmed fixture versions)
- [ ] **Task B.2 — Transform: CSV → canonical P2R latest.json** (melt wide→long, inner join on RegionID, per-region shared latest non-null month, ratio = ZHVI/(ZORI×12); array-of-records sorted by RegionID, no Date construction, no locale formatting — ADR-0004 determinism rules)
  - AC: `npm test -- transform` → all pass (incl. edge cases: missing rent, missing value, div-by-zero, leading-zero ZIPs, metro-vs-ZIP column counts)
  - AC (golden snapshot, gate critique #2): `npm run etl -- --input tests/fixtures --out /tmp/out && diff -r /tmp/out tests/golden/` → no output — CI regenerates and diffs the COMMITTED golden snapshot (cross-platform byte-identity, constitution VI)
  - AC (CI proof): `gh run watch $(gh run list --limit 1 --json databaseId -q ".[0].databaseId") --exit-status` → exits 0 on the push that adds the golden-diff step (same pattern as D.2)
- [ ] **Task B.3 — Fetch-integrity + validation gate** (HTTP 200 + CSV content-type + expected header row + non-empty BEFORE parse; schema check; row-count sanity; ratio-range sanity; outer-join audit counts)
  - AC: `npm run etl:validate -- tests/fixtures/invalid/bad-schema.csv; echo "exit=$?"` → prints `exit=1` AND stderr contains the token `SCHEMA_VIOLATION:` followed by the offending column name (invalid fixtures live in `tests/fixtures/invalid/` so B.1's count-4 AC stays true — amendment approved 2026-07-07) (error-token vocabulary: `SCHEMA_VIOLATION:` `ROWCOUNT_ANOMALY:` `RATIO_RANGE:` `FETCH_INTEGRITY:` — every validation failure emits exactly one)
  - AC (gate critique #4): `npm run etl:fetch -- --url https://files.zillowstatic.com/DOES-NOT-EXIST.csv` → exits 1 naming the failed URL (404/rename path fails loudly)
- [ ] **Task B.4 — Metro boundaries: CBSA cartographic shapefile → simplified GeoJSON → prebuilt SVG choropleth** (mapshaper + d3-geo, pure JS — ADR-0004; no tippecanoe/PMTiles in V1)
  - AC: `npm run map:build -- --fixtures` → emits `metro-map.svg`; `npm run map:verify -- --fixtures` → prints `PATHS=<n> JOINED=<n> OK` and exits 0 (path count == joined-metro count, every path has a fill class + data-region-id); on any failure prints `MAP_VERIFY:` + reason to stderr and exits 1 (amendment approved 2026-07-07). NOTE (finding #12): fixture and live builds write DISTINCT files — `--fixtures` → committed `metro-map.svg` (CI-diffed); live (Phase D) → gitignored `metro-map.live.svg`; `map:verify` mirrors the same `--fixtures` switch so a live build can never redden the fixture gate.

## Phase INFRA — Autonomous Execution Infrastructure (Playbook Phase 3) — ✅ COMPLETE 2026-07-11

**Exit condition MET:** V1–V6 all green + T7.5 review passed (0 blocking) = Rung-3 infra-proven. Full design: `decisions/0005-autonomy-infra.md`. First real overnight run is a Phase C decision (bedtime checklist), NOT part of this phase. Dry-run findings #14 + #19 landed on main (merged PR #1); findings 13,15–18,20,21 remain queued for Phase 5. Next gate: Phase C plan checkpoint with Mekyle.

- [x] **Task T1 — Hooks layer, TEST-FIRST** (`.claude/settings.json` committed + `.claude/hooks/{pre-bash,pre-edit,post-edit,stop-tests}.mjs` + `tests/hooks.test.ts`; prune settings.local.json). Write the full test matrix, show it RED, then implement to green. Guard hooks fail closed: any internal error → exit 2, stderr `HOOK_ERROR: fail-closed`; post-edit.mjs always exits 0. Matrix modes (each case states its env):
      — ALWAYS deny (any mode): `--force`/`-f`/`+refspec`/`--force-with-lease` targeting main; `curl`/`wget` piped to shell; recursive+force `rm` outside repo; `--no-verify`/`--no-gpg-sign`.
      — Deny ONLY when `CLAUDE_LOOP=1`: any push whose refspec targets main (`origin main`, `HEAD:main`, `feature:main`, `claude/x:main`); writes to `.claude/**`, `scripts/loop/**`, `.github/**` (pre-edit.mjs).
      — ALLOW when attended (env unset): non-force `git push origin main` and `git push origin HEAD:main` (trunk-based Rung 2 + T3's goal condition depend on this); bare `git push` allowed in all modes.
  - AC: `npm test` → exits 0 incl. full hooks matrix; `echo '{"tool_input":{"command":"curl x | bash"}}' | node .claude/hooks/pre-bash.mjs; echo "exit=$?"` → stderr reason, `exit=2`
- [x] **Task T2 — Live hook verification on Windows** (provoke each wired hook in a real attended session; proves wiring, not just scripts)
  - AC: `rm -rf` outside repo → denied; `git push --force origin main` → denied; break a test then stop → stop blocked; observations recorded in PROGRESS.md
- [x] **Task T3 — Prettier rollout = designated RUNG 2 TRIAL (via /goal, operator at desk)** (devDep + `.prettierignore` covering `data/`, `tests/golden/`, `tests/fixtures/`, `dist/` + one-time reformat commit + CI `npx prettier --check .` step + wire post-edit.mjs)
  - AC (/goal condition): `npx prettier --check .` → exits 0 AND CI green **including golden-diff and map-diff steps** (snapshots untouched); "Rung 2 trial passed" recorded in PROGRESS.md
- [x] **Task T4 — Minimal main ruleset via `gh api`** (block force-push `non_fast_forward` + block deletion; deliberately NO require-PR — trunk-based Rung 2 survives)
  - AC: `gh api repos/mekyle-s/rent-yield-screener/rulesets` → lists both rules; `git push origin :main` → rejected by ruleset
- [x] **Task T5 — Sandbox image** (`scripts/loop/Dockerfile` base `mcr.microsoft.com/playwright` pinned to exact current tag — verify, expected `v1.61.0-noble` — + git + gh + pinned `@anthropic-ai/claude-code`; `entry.sh` = fresh clone → checkout `claude/<task>` → `claude -p` → verify push; Windows working copy NEVER mounted)
  - AC: `docker build -t rys-loop scripts/loop` → exits 0; `docker run --rm rys-loop bash -lc 'claude --version && gh --version && git --version'` → three versions print; pinned tag recorded for ADR-0005
- [x] **Task T6 — Loop credentials** (SUPERVISED — Mekyle creates fine-grained PAT: single repo, Contents R/W + PRs R/W + Metadata R, 30-day expiry, NO `workflow` permission; runs `claude setup-token`; both land in `~/.claude-loop.env`, never committed)
  - AC: in-container `gh api repos/mekyle-s/rent-yield-screener` → 200; `claude -p "reply OK"` → OK; clone + push to scratch branch succeeds
- [x] **Task T7 — Loop driver + smoke** (`scripts/loop/loop.sh`: preflight → iterations via `docker run --rm --init --ipc=host --env-file ~/.claude-loop.env -e CLAUDE_LOOP=1` → `LOOP:HALT` sentinel grep between iterations → stop on sentinel/cap/2 consecutive failures → `gh pr create`; plus `scripts/loop/PROMPT.md`)
  - AC: `./scripts/loop/loop.sh --preflight-only` → exits 0; in-container `npx playwright screenshot` of `astro preview` → PNG exists; in-container hook provocation under `--dangerously-skip-permissions` → deny observed
- [x] **Task T7.5 — Scoped code review gate** (strong model, FRESH-CONTEXT subagent, T1–T7 diff ONLY: hooks, settings.json, Dockerfile, entry.sh, loop.sh, PROMPT.md; scope estimate stated + approval BEFORE launch; findings fixed test-first; fix diff re-reviewed. **T8 blocked until this passes.**)
  - AC: review findings all fixed test-first; re-review of fix diff clean; `npm test` → exits 0
- [x] **Task T8 — Supervised Ralph dry-run** (2–3 watched iterations on `claude/dry-run` burning 2–3 mechanical findings from 13–21 — Phase 5 queue exception granted 2026-07-10; loop runs `--model sonnet` exactly as it will overnight)
  - AC: each iteration = fresh context, ONE task, PROGRESS.md updated, atomic commit, clean exit; halt via `LOOP:HALT`; PR opened; CI green on PR
- [x] **Task T9 — Close-out** (`decisions/0005-autonomy-infra.md` incl. pinned Playwright tag C.1's devDep must match + bedtime-checklist appendix + Sonnet-default cost table; HQ leads.md verdicts: TDD Guard KILL, container-use KILL, Chrome DevTools MCP NOT ADOPTED-conditional, @playwright/test ADOPTED; HQ `research/phase-3/notes.md` evidence; CLAUDE.md `npm run check` claim fix; PROGRESS.md both repos)
  - AC: all listed files exist at stated paths; leads.md shows the three new Phase 3 verdicts

## Phase C — Map + Pages (plan v3 APPROVED by Mekyle 2026-07-11 — plan checkpoint gate passed)

**Exit condition:** deployed site shows interactive choropleth + metro pages from fixture data; screenshot verification passed. Phase-gate proof: `curl -sL -o /dev/null -w "%{http_code}" https://<project>.pages.dev/metro/<first-slug>/` → prints `200`; national-view + one metro-page screenshot + second fresh-context confirmation pass; CI green incl. golden-diff, map-diff, prettier, widened attribution step, and (post-C.3b) check-seo.

- [x] **Task C.0 — keyword instrument correction (GKP)** (instrument = free Google Keyword Planner export at `../Bus_Idea_Project/research/phase-2/ahrefs-export.csv` (path updated 2026-07-12 — instrument re-amended GKP → Ahrefs Starter, see HQ decision doc), judged by the LOWER-BOUND rule — ranges read at their lower bounds — against the unchanged pre-registered thresholds in HQ `01_idea_selection/02-decision.md`; historical records in ADRs/ledgers untouched; same commit persists the approved Phase C plan into this section)
  - AC: `git grep -inE "[k]eywords everywhere|\b[k]e\b" -- "*.md" | wc -l` → prints exactly `0`
  - AC: `git grep -q "research/phase-2/ahrefs-export.csv" -- ROADMAP.md; echo "exit=$?"` → prints `exit=0`; same command for PROGRESS.md → prints `exit=0`
- [ ] **Task C.1 — SVG choropleth page (metro level) + searchable metro index** (ATTENDED Rung 2 — screenshot judgment is a UI call. Inline prebuilt SVG from B.4; hover tooltip + click reveals that metro's ratio IN-PAGE (tooltip/panel), NOT navigation — metro pages arrive in C.2; hrefs to `/metro/<slug>/` may exist but are not asserted. Replaces the skeleton `index.astro` incl. its `new Date()` stamp; data from the fixture-derived latest.json. Playwright arrives here: `@playwright/test` devDep pinned EXACTLY `1.61.1` (ADR-0005 image pin), `playwright.config.ts` testDir `tests/e2e` + webServer PREVIEW-ONLY (`command: npm run preview`, `reuseExistingServer: true` — the AC's build is the only build; the test never serves a missing or stale `dist/`) + chromium only, `test:e2e` npm script, vitest excludes `tests/e2e/**`. Precondition, one-time on this machine: `npx playwright install chromium`.)
  - AC: `node -e "process.stdout.write(require('./package.json').devDependencies['@playwright/test'])"` → prints exactly `1.61.1`
  - AC: `npm run build && npx playwright test --reporter=line; echo "exit=$?"` → prints `exit=0`; spec asserts (a) SVG present with exactly 15 `path[data-region-id]` elements, (b) clicking a metro path reveals that metro's ratio in-page
  - AC: `npm run build && grep -o 'data-region-id="' dist/index.html | wc -l` → prints exactly `15` (attribute form — the page's CSS selector and JS delegation legitimately contain the bare string; occurrence count, not `grep -c` line count — compressHTML can emit one line. Amended from the bare-string pattern at C.1 execution, Mekyle-approved)
  - AC: `npm test; echo "exit=$?"` → prints `exit=0` (vitest untouched by e2e specs)
  - AC (SUPERVISED element): national-view screenshot captured + second fresh-context pass confirms the choropleth is visibly colored; recorded in PROGRESS.md
- [ ] **Task C.2a — widen CI attribution gate to recursive** (ATTENDED Rung 2 micro-task, ~one line — loop is hook- and PAT-blocked from `.github/**`. File selection becomes `grep -rL "Data Provided by Zillow Group" --include="*.html" dist/metro`; the glob-shaped `if ls dist/metro/*.html` guard becomes a directory-existence guard `if [ -d dist/metro ]` so the step still passes while `dist/metro` does not exist yet. Pushed with Mekyle's credentials.)
  - AC: `grep -c -- "grep -rL" .github/workflows/ci.yml` → prints exactly `1`
  - AC: `gh run watch $(gh run list --limit 1 --json databaseId -q ".[0].databaseId") --exit-status; echo "exit=$?"` → prints `exit=0` on that push (step passes with `dist/metro` still absent)
- [x] **Task C.2 — Metro page template** (Rung-3 loop candidate. One page per fixture metro at `src/pages/metro/[slug].astro` — Astro default DIRECTORY output, `dist/metro/<slug>/index.html`; clean extensionless URLs are the product decision for an SEO-first site. Shows ratio, 12-mo trend sparkline (inline SVG from the monthly series), top-ZIP table (fixture zips joined by metro), attribution EXACT string `Data Provided by Zillow Group` — verbatim what CI greps. Index-page exposure of `data-snapshot-month` (D.2 pre-requirement): ALREADY satisfied — the inlined SVG root carries `data-snapshot-month="2026-05"` stamped by the map build from the same snapshot (C.1 landed the inline). C.2 must NOT add a second occurrence; the AC counts exactly 1. Clarified at C.1 execution so the loop task is unambiguous.)
  - AC: `npm run build && find dist/metro -name "*.html" | wc -l` → prints exactly `15`
  - AC: `grep -rL "Data Provided by Zillow Group" --include="*.html" dist/metro | wc -l` → prints exactly `0` (identical string + recursive selection to the C.2a-widened CI step; constitution V)
  - AC: `grep -o 'data-snapshot-month="2026-05"' dist/index.html | wc -l` → prints exactly `1` (golden snapshotMonth; D.2 hook in place)
  - AC: `npm test; echo "exit=$?"` → prints `exit=0`
- [ ] **Task C.3 — SEO plumbing: site artifacts + checker, NO CI edit** (Rung-3 loop candidate; the CI step is C.3b — loop hook denies `.github/**` and the loop PAT lacks `workflow` permission. Sitemap via `@astrojs/sitemap` → `dist/sitemap-index.xml`; `robots.txt` pointing at it; canonical; meta description + default OG on every page; JSON-LD with `<`/`>`/`&` escaped in the serializer before `set:html` (gate critique #8). Writes `scripts/check-seo.ts` + a deliberately-bad fixture in `tests/fixtures/seo-invalid/` and a test asserting the checker FAILS on it — non-vacuous by construction. ACs fresh-clone-safe; sitemap/robots ACs run after the first AC in the same iteration so `dist/` exists.)
  - AC: `npm run build && npx tsx scripts/check-seo.ts dist/; echo "exit=$?"` → prints `SEO_OK pages=16` then `exit=0` (15 metro pages + index; per page: title, meta description, canonical, JSON-LD present AND no raw `<`/`>` inside the JSON-LD payload)
  - AC: `npx tsx scripts/check-seo.ts tests/fixtures/seo-invalid/; echo "exit=$?"` → stderr contains `SEO_VIOLATION:` and prints `exit=1` (negative self-test; subdir keeps B.1's `ls tests/fixtures/*.csv | wc -l` → 4 true — same pattern as `invalid/`)
  - AC: `ls dist/sitemap-index.xml` → exit 0; `grep -c "Sitemap:" dist/robots.txt` → prints exactly `1`
  - AC: `npm test; echo "exit=$?"` → prints `exit=0`
- [ ] **Task C.3b — check-seo CI step** (ATTENDED Rung 2, one line of YAML pushed with Mekyle's credentials: a single `run:` line with NO `name:` line — `- run: npx tsx scripts/check-seo.ts dist/` after Build — so the string `check-seo` appears exactly once in the workflow file and the AC below stays true. Runs after C.3 merges.)
  - AC: `grep -c "check-seo" .github/workflows/ci.yml` → prints exactly `1`
  - AC: `gh run watch $(gh run list --limit 1 --json databaseId -q ".[0].databaseId") --exit-status; echo "exit=$?"` → prints `exit=0` on the push that adds the step
- [x] **Task C.4 — SEO SCALE DECISION** ✅ DECIDED 2026-07-12 (advisor gate): **top-50 curated metro build** — lower-bound head-term aggregate 4,650/mo (1.5K–5K band), city long-tail avg 0.83/mo. **D.1 scales to 50 curated metros, NOT 400.** C.1–C.3 scope unchanged (15 fixture metros this phase). Recorded in PROGRESS.md + HQ decision doc. (SUPERVISED, never loops — was BLOCKED until `../Bus_Idea_Project/research/phase-2/ahrefs-export.csv` exists (2026-07-12 amendment: instrument is Ahrefs Starter, $29/mo one month; Starter blocks CSV export, so Mekyle produces the file by attended transcription from the committed `ahrefs-capture-*.png` screenshots; the 54-keyword basket stays as pre-registered in HQ `research/phase-2/keyword-export-list.md`). When unblocked: read every range value at its LOWER bound (not indexed in Ahrefs = 0), aggregate head terms + city long-tail sample, judge against the unchanged pre-registered thresholds in HQ `01_idea_selection/02-decision.md` — ≥5K/mo head + ≥2/mo city avg → 400-metro build · 1.5K–5K head → top-50 curated · <1.5K head + dead long-tail → PIVOT, SEO demoted. Ahrefs numbers bind (per the escalation clause — no third measurement). Decision recorded in the HQ decision doc + this repo.)
  - AC (unblock gate): `test -f "../Bus_Idea_Project/research/phase-2/ahrefs-export.csv"; echo "exit=$?"` → prints `exit=0` (satisfied 2026-07-12 — the transcribed export is committed in HQ)
  - AC (decision recorded): `grep -Ec "C\.4 DECISION: (400|50|PIVOT)" PROGRESS.md` → prints exactly `1` (the line also cites the lower-bound head-term and city-avg numbers used)

## Phase D — Production Data + Cron

**Exit condition:** site serves real current-month Zillow data; refresh runs unattended.

- [ ] **Task D.1 — Full ETL on live data** (all metros per C.4 decision + ZIP data for top-ZIP tables; no ZIP map — ADR-0004)
  - AC: `npm run etl:live && npm run etl:validate` → exits 0; spot-check 3 known metros against Zillow's published values (±1%)
  - NOTE (plan v3, 2026-07-11): the ">500 metro paths" sanity check lives HERE, relocated from C.1 — the fixture map has exactly 15 paths; verify on the live build: `grep -o 'data-region-id' data/map/metro-map.live.svg | wc -l` → prints a number >500
- [ ] **Task D.2 — Monthly GitHub Actions cron** (fetch → transform → validate → rebuild SVG → commit latest.json + tag → push; Pages auto-deploys — built-in GITHUB_TOKEN only, no new secrets)
  - AC: `gh workflow run refresh.yml && sleep 10 && gh run watch $(gh run list --workflow=refresh.yml --limit 1 --json databaseId -q ".[0].databaseId") --exit-status` → exits 0
  - AC: `curl -s https://rent-yield-screener.pages.dev/ | grep -o 'data-snapshot-month="[0-9]\{4\}-[0-9]\{2\}"'` → prints the same `YYYY-MM` as `jq -r .meta.snapshotMonth data/latest.json` (the index page template MUST expose `data-snapshot-month` — requirement lands in C.2)

<!-- D.3 failure alerting DELETED at gate (simplicity cut #3): GH Actions' default failure email suffices;
     the real failure mode (Zillow URL rename/404) is covered by B.3's fetch-integrity gate. -->

<!-- Phase E (hardening/production-readiness/portfolio) and beyond live in the HQ PLAYBOOK Phase 5;
     alerts tier + 30K ZIP pages are DEFERRED.md items, not phases. -->

## Dependencies

- B.4 blocked by B.1 · C.1 blocked by B.2+B.4 · C.2a blocked by C.1 · C.2 blocked by B.2+C.2a · C.3b blocked by C.3 · D.\* blocked by C gate · C.4 blocked on `../Bus_Idea_Project/research/phase-2/ahrefs-export.csv` existing (Mekyle produces it manually — attended transcription; exists as of 2026-07-12)
- C.* blocked by Phase INFRA exit (Rung-3 infra-proven) · T3 blocked by T1 (post-edit.mjs exists) · T6 SUPERVISED · T7 blocked by T5+T6 · T8 blocked by T7.5 · first overnight run = Phase C decision, not INFRA
