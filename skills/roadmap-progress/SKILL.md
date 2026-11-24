---
name: roadmap-progress
description: Read-only outline of a multi-session roadmap - phases done, the current step, what waits on you, and the prompt to paste for the next phase
argument-hint: [topic]
disable-model-invocation: true
allowed-tools: Read, Bash(git worktree list:*), Bash(git branch --show-current), Bash(ls *), Bash(test -e *), Bash(test -L *)
---

# Roadmap Progress v1.0.0

Outline where a roadmap stands. Arguments: "$ARGUMENTS"

## Arguments

- **Empty:** choose the roadmap from the repo: the only active one, or
  the one on the current branch. With several and no single match, give
  the overview instead.
- **A topic:** the roadmap folder `.claude/plans/<topic>/`, matched
  exactly, in any state directory.

## Steps

1. **Load the `plans-and-roadmaps` skill** and follow its Roadmap
   progress section: finding the roadmaps, choosing one, the overview,
   and the outline. It is the single source for those rules and for the
   progress-line format.
2. **Read the live files** each time: `roadmap.md`, and the current
   phase plan when it exists. Never answer from the conversation or from
   memory; when the two disagree, the files win.
3. **Stop after the outline or the overview.** Do not offer to plan,
   start or continue a phase; the outline's Next line already gives the
   prompt.

## Read-only

The outline changes nothing.

- **Do not** stamp, edit, link, copy or move plan files, or refresh the
  roadmap's `updated` time.
- **Do not** freeze an idle phase link, even when Check the link first
  would. Name it under "Waiting on me" instead.
- **Do not** run tests, builds or git commands beyond those in
  `allowed-tools`.

## Outside a git repo

Say in one line that roadmaps live in a repo's `.claude/plans/`, and
stop.
