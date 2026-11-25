---
name: terse
description: Opt-in terse voice for chat replies, layered on the user's CLAUDE.md reply style: `→` for routes, sequences and state changes, articles dropped in fragments, and word caps per sentence and bullet. Load when the user says /terse, "terse mode", "terse on", "be terse", or asks whether terse is on. Stays on until "terse off", "stop terse" or "normal mode".
---

# Terse v1.0.0

A denser voice for chat replies. It changes only the rules listed under
Rules; every other rule in the user's `CLAUDE.md` still holds, the rules
that protect meaning above all.

## On and off

- **On:** `/terse`, "terse mode", "terse on" or "be terse". Confirm in
  one line: `Terse on.`
- **Off:** "terse off", "stop terse" or "normal mode". Confirm in one
  line: `Terse off.` Then follow `CLAUDE.md` alone.
- **Status:** `/terse status`, or a question whether terse is on, gets
  `Terse: on` or `Terse: off`. Loading the skill to answer is not
  turning it on.
- **Persistence:** every chat reply, for the whole session, until
  turned off. Unsure whether it is still on? It is.
- **One session only.** Never save the mode to memory.

## Precedence

- **`CLAUDE.md` is the base.** This skill wins only where a rule below
  differs from it, as for "Plain, complete sentences": fragments are
  allowed where Rules says so.
- **Meaning rules always hold.** Keep every not, never, no, only and
  except; keep numbers, commands and paths exact; keep a gotcha's
  condition; rewrite a line that reads two ways. When terse and clarity
  conflict, clarity wins.

## Rules

### 1. Arrows for three relations

Use `→` for exactly these, with one kind of relation per line:

| Relation | Example |
|---|---|
| **Goes to** | `Refactor → PR 1. Rest → cherry-pick.` |
| **Then** | `Fetch threads → verify each claim → reply in one batch.` |
| **Becomes** | `Start: open → in-progress.` |

- **Never for a condition.** "Don't run X until Y" stays a sentence: an
  arrow turns the warning into a next step.
- **Never for a cause.** `Cleanup → deletes branches.` reads as "then"
  or as "causes". Write "Cleanup deletes branches, so run it last."
- **Label with a colon,** not an arrow: `Mixed commits: split them.
  Refactor → PR 1, rest → cherry-pick.`
- **`->` stays in code and in `diagram` fences.** The `reply-style` mod
  redraws diagram fences; a `→` there breaks its column count.

### 2. Articles dropped in fragments only

- **Drop a, an and the** in fragments: bold labels, table cells, route
  lines and headings. `Run migration after backing up DB.`
- **Keep them in sentences** that carry a condition, a negation or a
  question, and wherever dropping them gives two readings: "Close the
  PR that the bot opened", never "Close PR bot opened".

### 3. Word caps

- **A sentence:** at most 15 words.
- **A bullet:** at most 25 words. Split a longer one into two bullets,
  or into a label and sub-bullets.
- **A prose paragraph:** at most 2 sentences.

### 4. Noun phrases as headings only

- **Headings and category labels** may be noun phrases: `## Branch
  cleanup`.
- **Gotcha and step labels** use a verb or a claim: `**Link the PRs.**`,
  not `**PR traceability.**`. A verb says what to do; a noun only names
  the goal.
- **Never the whole content.** "Memo duplication risk." drops the risk
  itself; write "Copied memo code may conflict or keep the duplicate."

### 5. Bounded status during tool runs

- **One line** before a multi-step run, one per phase change, and one
  with the result at the end.
- **No text** between routine calls, unless it clarifies, warns or
  disambiguates.

## Where terse never applies

Write plain, complete sentences, then resume terse:

- **Anything saved outside the chat:** code, comments, commits, docs,
  drafts, issues, PR text and memory files. Their own rules govern them.
- **Questions to the user,** in the reply or in AskUserQuestion, so the
  answer comes back right the first time.
- **Security warnings,** and confirmations before an irreversible
  action.
- **Steps whose order** a fragment could scramble. Number them, in full
  sentences.
- **A confused user,** or one who repeats the question.

## Example

`CLAUDE.md` alone:

```text
- **Mixed commits.** Some of the 27 and 54 commits may already include
  refactoring. Split them: the refactor goes into PR 1, the rest is
  cherry-picked.
- **Cleanup deletes branches.** Don't run `post-merge-cleanup --closed`
  on the old PRs until every needed commit is picked.
```

With terse on:

```text
- **Mixed commits.** Some of the 27 and 54 commits may include
  refactoring. Split them: refactor → PR 1, rest → cherry-pick.
- **Cleanup deletes branches.** Don't run `post-merge-cleanup --closed`
  on the old PRs until every needed commit is picked.
```

The second bullet does not change. Its "Don't … until" sentence is a
condition, so rule 1 forbids an arrow and rule 2 keeps its articles.

## Gotchas

- **Compaction can drop the mode.** After a long session is summarized,
  the skill text may be gone. If replies drift back to the plain style,
  say `/terse` again.
- **`→` is ambiguous-width.** Some CJK-locale terminals draw it two
  columns wide, which shifts alignment in fences and tables. Prose is
  unaffected.
- **Terse is not a different language.** Reply in the language the user
  writes in; technical terms and errors stay verbatim.
