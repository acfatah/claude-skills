# reply-style

A Claude Code mod that redraws parts of Claude's terminal replies in the
style of [glow](https://github.com/charmbracelet/glow). Each part is a
feature you can turn on or off on its own:

- **Tables:** one rule under the header, `│` between columns, no outer box
  and no rules between rows. Inline code in a cell is red on grey (`203` on
  `236`), and bold stays bold.
- **Bullets:** unordered list items start with `•` instead of `-`, nested
  ones indented 2 columns per level, and wrapped lines line up under the
  item's text.

Replies the mod has nothing to change in are left to the built-in renderer.

A table before, with the built-in renderer:

```
┌────────┬──────────┐
│ Option │ Cost     │
├────────┼──────────┤
│ A      │ uses dev │
├────────┼──────────┤
│ B      │ none     │
└────────┴──────────┘
```

After, with the mod:

```
Option │ Cost
───────┼─────────
A      │ uses dev
B      │ none
```

A list before, then after:

```
- First point, long enough to
  wrap onto a second line
  - A nested point
```

```
• First point, long enough to
  wrap onto a second line
  • A nested point
```

## What it is

- **A terminal display change.** It hooks the `AssistantMessage` render on
  the terminal surface only, and only for replies with a part it
  changes: a table or a bullet list.
- **Display only.** The stored message and what the model sees are
  unchanged; the mod redraws the text it is given.
- **Shorter tables.** Measured on one machine, a table takes about 25-33%
  fewer rows than the boxed version at 80 to 100 columns.
- **Fast.** Measured on one machine, offline, across runs: a 3-row table
  took 0.02-0.06 ms to lay out, a 40-row table 0.23-0.62 ms, and a 30-item
  nested list 0.08-0.15 ms. Live in a session, a table render averaged
  1.1 ms, with a 3 ms maximum; that was measured before bullets were
  added.
- **Switchable.** `/reply-style tables off` hands tables back to the
  built-in renderer without unloading the mod; `/reply-style off` does it
  for every feature.

## What it is not

- **Not a theme.** It changes only its features' parts; prose, headings,
  ordered lists and code blocks go through Claude Code's own markdown
  renderer.
- **Not a list renderer for every list.** Bullets nested under an ordered
  (`1.`) item stay with that item, so the built-in renderer draws them with
  `-`.
- **Not a markdown renderer for cells.** Only `**bold**` and `` `code` ``
  are styled inside a cell; everything else is shown as written.
- **Not for other surfaces.** The desktop app, the web app and IDE
  extensions keep their own tables and lists.

## When not to use

- **Your tables hold wide characters** (CJK text, emoji) → keep the
  built-in renderer. The mod counts characters, not terminal columns, so
  those columns come out misaligned.
- **Your cells hold links or italics** → keep the built-in renderer. The
  mod shows `[text](url)` and `*text*` as raw markdown.
- **You want boxed tables** → run `/reply-style tables off`.
- **You want `-` bullets back** → run `/reply-style bullets off`.

**Negative example:** a reply that compares CJK place names with emoji
status icons in a table will not line up with this mod; turn it off with
`/reply-style tables off` for that session.

## Install

The mod needs Claude Code 2.1.326 or later. The mod API is early access,
so a later Claude Code may change it.

Clone the repo, then start Claude Code with the mod's folder:

```bash
git clone https://github.com/acfatah/skills.git
claude --plugin-dir <clone>/mods/reply-style
```

To load it in every session, set `CLAUDE_CODE_PLUGIN_DIRS` in the `env`
block of `~/.claude/settings.json`, inside the existing top-level object:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "<clone>/mods/reply-style"
  }
}
```

The skills CLI (`bunx skills add`) does not install mods, and there is no
marketplace entry yet, so `/plugin install` does not find it.

## Usage

### How it loads

- **Automatically.** Once the folder is loaded, every terminal reply with a
  markdown table or a bullet list is drawn by the mod. Since most replies
  have bullets, that is most replies. There is nothing to ask for.
- **Only when needed.** A reply with nothing to change, or with tables and
  bullets only inside code fences, goes to the built-in renderer
  unchanged.
- **Nothing asks back.** The mod has no prompts and no settings file.

### The `/reply-style` command

- **`/reply-style`:** shows which features are on, and stats for this
  load: message renders seen, renders drawn by the mod, tables and bullet
  lists drawn, table rows compact against an estimate for boxed, and hook
  time per drawn render (average and maximum).
- **`/reply-style tables off`**, **`/reply-style bullets off`**, and `on`
  for either: turn one feature off or on. New and redrawn replies follow
  the switch.
- **`/reply-style off`** and **`/reply-style on`:** turn every feature off
  or on.
- **`/reply-style reset`:** sets the stats back to zero.
- **Anything else** shows the usage line.

### Example prompts

- **See it:** "Compare SQLite, Postgres and DuckDB in a table: setup,
  concurrency, best fit."
- **Check it:** `/reply-style` after a few table replies, to see the rows
  saved and the render time.
- **See bullets:** "List three tradeoffs of SQLite, with a nested example
  under each."
- **Switch:** `/reply-style tables off`, then ask for the same table again
  to compare with the built-in renderer; `/reply-style bullets off` does
  the same for lists.
- **Start over:** `/reply-style reset` before a test run.

### Checks

Run these from the repo root after a change:

```bash
claude plugin validate mods/reply-style
claude plugin test mods/reply-style
bun mods/reply-style/bench/table.bench.ts
```

- **`validate`** type-checks the hooks module. It warns that the mod has
  no icon; that is expected.
- **`test`** runs three files. `hooks/register.test.tsx` checks that a
  reply with a table or bullets is drawn by the mod, and that one with
  neither is left to the built-in renderer. `hooks/segment.test.ts` checks
  how a reply is split: nested and wrapped items, fences, rules, ordered
  lists, and each switch. `hooks/command.test.ts` checks the command's
  arguments.
- **The benchmark** prints the time per render for a 3-row table, a 40-row
  table, a 30-item nested list and a reply with neither, then the rows
  saved at 100, 80 and 60 columns, and a sample table.

Gotchas:

- **Column widths are simple.** Columns that fit keep their natural width,
  and the rest share what is left evenly, so a long column can wrap more
  than it needs to.
- **Wide characters misalign.** Widths count characters, so CJK text and
  emoji push a row out of line.
- **Only bold and code are styled in cells.** Links, italics and
  strikethrough show as raw markdown.
- **Stats reset on reload.** They live in memory for the current load of
  the mod; a restart or reload starts them at zero.
- **Tables drawn counts repeats.** It counts per render, so a reply that
  streams in is counted each time it redraws.
- **Its own bullet and gaps.** For a reply it draws, the mod draws the
  `●` bullet and the blank lines between parts itself, so spacing can
  differ a little from a reply the built-in renderer draws.
- **A bug shows in most replies.** Bullets put most replies through the
  mod, so a mistake in its list code shows nearly everywhere.
  `/reply-style bullets off` is the way out until it is fixed.
- **Indents count spaces.** A tab counts as one column, so a list indented
  with tabs can nest differently from the built-in renderer.
- **Loose items keep a blank line.** A blank line between two items stays
  in the drawing, as it does in the source.
- **Task items are plain items.** `- [ ] task` draws as `•` followed by
  `[ ] task`.

The code is in [`hooks/register.tsx`](hooks/register.tsx),
[`hooks/segment.ts`](hooks/segment.ts), [`hooks/table.ts`](hooks/table.ts)
and [`hooks/command.ts`](hooks/command.ts).
