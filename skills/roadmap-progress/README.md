# roadmap-progress

An [agent skill](https://skills.sh) that shows where a multi-session
roadmap stands. Run `/roadmap-progress` and Claude prints one line per
phase, the current step, anything that waits on you, and the prompt to
paste for the next phase. It is read-only, and it takes its rules from
[`plans-and-roadmaps`](../plans-and-roadmaps).

## What it is

- **One line per phase:** `✅` stamped, `⛔` has a blocked step, `▶` the
  current phase, `○` not started, with a step count or `not planned yet`.
- **Opens with the progress line,** such as **Phase 2/4 · Step 3/5**,
  counted from the live headings of `roadmap.md` and the current phase
  plan.
- **Shows the last phase outcome** in one line, and a "Waiting on me" line
  for blocked steps, broken phase links, or a roadmap whose copy step
  never finished.
- **Ends with the prompt to paste:** "Continue phase N of …", "Plan phase
  N of …" for a fresh plan-mode session, or the move to `completed/` once
  every phase is stamped. The path is absolute, so it works from any
  folder.
- **Handles several roadmaps.** With no argument it shows the only active
  roadmap, or the one whose `## Decisions` names the current branch.
  Otherwise it lists every active roadmap in one line each and stops.
- **Finds roadmaps from a worktree** too, by reading the main checkout's
  `.claude/plans/`.
- **Read-only.** It never stamps, edits, links, copies or moves a plan
  file, and never plans or starts a phase.

## What it is not

- **Not a session recap.** Git state, drift and uncommitted work belong
  to [`session-recap`](../session-recap).
- **Not a plan lister.** Plans that are not roadmaps, and plans grouped by
  state, belong to [`plans-and-roadmaps`](../plans-and-roadmaps).
- **Not a self-starter.** It gives the next prompt; you start the session
  and the plan mode.

## When not to use

- **You want where this session stands** → use
  [`session-recap`](../session-recap), which checks git and the
  conversation.
- **You want to list every plan by state** → ask "List my plans", which
  [`plans-and-roadmaps`](../plans-and-roadmaps) handles.
- **You want to fix a broken phase link or move a roadmap** → ask
  [`plans-and-roadmaps`](../plans-and-roadmaps); this skill only names
  the problem.

**Negative example:** "Mark phase 2 done" does not use this skill; it
needs `plans-and-roadmaps`, which writes the stamps this skill never
writes.

## Install

```bash
bunx skills add acfatah/claude-skills -s roadmap-progress -a claude-code -g -y
```

For local development, link the folder instead:

```bash
ln -sfn "$PWD/skills/roadmap-progress" ~/.claude/skills/roadmap-progress
```

It also needs [`plans-and-roadmaps`](../plans-and-roadmaps) installed,
since that skill holds the rules this one follows.

## Usage

### How it loads

- **By name only.** Model invocation is disabled, so Claude never loads it
  from a description match. Type `/roadmap-progress`, with an optional
  topic.
- **Arguments:** empty to let Claude choose the roadmap, or a topic, the
  folder name under `.claude/plans/`, matched exactly, in any state
  directory.
- **What Claude asks back:** nothing. When it cannot pick one roadmap, it
  shows the overview instead of asking.

### Example prompts

- **The current roadmap:** `/roadmap-progress`
- **One roadmap:** `/roadmap-progress postgres`
- **A paused roadmap:** `/roadmap-progress auth-revamp`, which says its
  state is paused.
- **Back from a break:** `/roadmap-progress`, then paste its Next prompt
  into the right session.

Gotchas:

- **The branch match is best-effort.** It works only when the roadmap's
  `## Decisions` names the topic branch. Otherwise, with several active
  roadmaps, you get the overview; rerun with a topic.
- **Topics match exactly.** A partial name lists the near matches rather
  than picking one.
- **Only this repo's roadmaps.** A roadmap for another repo lives in that
  repo's `.claude/plans/`.
- **Only some commands are pre-approved,** the ones in `allowed-tools`:
  `Read`, `git worktree list`, `git branch --show-current`, `ls`, and
  `test -e` and `test -L`.

The full rules are in [`SKILL.md`](SKILL.md) and in the Roadmap progress
section of the `plans-and-roadmaps` skill.
