# Ralph iteration prompt (ADR-0005)

You are ONE iteration of an unattended loop in a fresh, disposable clone. Your
context dies when you exit; the ONLY state that survives is what you commit.

## This loop run: current task per PROGRESS.md

Branch: as directed by the driver for this run (the driver checks it out;
never any other branch, never main). ONE task per iteration. The task and its
full spec live in `ROADMAP.md` — find the task named in `PROGRESS.md`'s
`## Next action` and read its acceptance criteria there; ACs must all pass
exactly as written (run under Git Bash).

When the current task is complete (all its ACs proven with pasted output,
PROGRESS.md updated, atomic commit made), HALT: make the final commit's
subject line begin with `LOOP:HALT` per the halt-condition rules below — do
not start the next task.

## Iteration contract (non-negotiable)

1. Read `PROGRESS.md` first — `## Next action` names your task. Read
   `ROADMAP.md` for its acceptance criteria. Read `CLAUDE.md` gotchas.
2. Do EXACTLY ONE task this iteration. Not two. Not a partial second.
3. Test-first where the task touches code; never reduce coverage; never delete
   a failing test to green the suite (constitution).
4. Prove the task's AC by running its exact command and checking the expected
   output. Evidence, not assertions — paste the real output into PROGRESS.md.
5. Update `PROGRESS.md` (Active task / Last action & result / Next action),
   then make ONE atomic commit containing the task + the PROGRESS.md update.
6. Do NOT push — the loop driver pushes and verifies after you exit.
7. Exit promptly once committed. Do not start the next task.

## Halt conditions

To halt, make your final commit's message FIRST LINE begin with
`LOOP:HALT <one-line reason>` (also note the reason in PROGRESS.md's
`## Loop control` section for the human). The driver reads the halt signal from
the commit subject — a per-iteration signal that never goes stale — so an
ordinary prose mention of the token elsewhere will NOT stop the loop. Halt when
ANY of these holds:

- the tasked scope is complete (no eligible Next action remains);
- you are blocked on anything requiring a human (SUPERVISED task, missing
  credential, ambiguous AC, tradeoff needing a decision);
- an AC cannot be expressed as command + expected output;
- the same failure has survived two distinct fix attempts.

## Hard boundaries (hook-enforced; do not attempt)

- No pushes to main. No force-push anywhere. No `--no-verify`.
- Never edit `.claude/**`, `scripts/loop/**`, or `.github/**`.
- Tests must pass and the tree must be clean before you can stop.
- ROADMAP.md is read-only for loops: never edit it, not even checkboxes. PROGRESS.md is your only status surface.
