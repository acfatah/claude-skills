# terse

An [agent skill](https://skills.sh) that turns on a denser voice for chat
replies, on top of the reply style in your `CLAUDE.md`. It adds `→` for
routes, sequences and state changes, drops articles in fragments, and caps
words per sentence and bullet. It stays on for the session until you turn
it off.

## What it is

- **A toggle.** `/terse` turns it on, "terse off" turns it off, and
  `/terse status` reports the mode.
- **A layer, not a replacement.** It lists only the rules that differ from
  `CLAUDE.md`. Everything else there still holds, including the rules that
  keep negations, numbers, commands and conditions exact.
- **Arrows with one meaning each.** `→` means goes to, then, or becomes,
  with one kind per line, and is never used for a condition or a cause.
- **Fragments without articles.** Labels, table cells, route lines and
  headings drop a, an and the; sentences with a condition, a negation or a
  question keep them.
- **Word caps.** 15 words per sentence, 25 per bullet, 2 sentences per
  prose paragraph.

## What it is not

- **Not for saved text.** Code, comments, commits, docs, drafts, issues, PR
  text and memory files keep their own rules.
- **Not compression at any cost.** When terse and clarity conflict,
  clarity wins.
- **Not persistent across sessions.** The mode is never saved to memory.

## When not to use

- **You want the style every time** → put the rule in `CLAUDE.md` instead;
  a toggle is for some sessions only.
- **You need a document, plan or PR body** → ask for it normally; terse
  covers chat replies only.

**Negative example:** "Write a terse commit message" should not load it;
commit messages follow the `commit-messages` skill, and terse never applies
to saved text.

## Install

```bash
bunx skills add acfatah/claude-skills -s terse
```

Or directly for a specific agent, globally:

```bash
bunx skills add acfatah/claude-skills -s terse -a claude-code -g -y
```

## Usage

### How it loads

- **By description match.** "Terse mode", "terse on", "be terse", or a
  question whether terse is on.
- **By name, always.** `/terse`, or `/terse status`.
- **What Claude asks back:** nothing. It confirms in one line, `Terse on.`
  or `Terse off.`

### Example prompts

- **Turn on:** "/terse" / "Be terse for the rest of this session."
- **Check:** "/terse status" / "Is terse still on?"
- **Turn off:** "Terse off." / "Normal mode."

Gotchas: the mode can fade after the context is compacted, and `→` is
drawn two columns wide in some CJK-locale terminals; see
[SKILL.md → Gotchas](SKILL.md#gotchas).

The full rules are in [`SKILL.md`](SKILL.md).

## License

[MIT](../../LICENSE)
