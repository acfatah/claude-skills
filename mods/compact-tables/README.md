# compact-tables

A Claude Code mod that redraws markdown tables in Claude's terminal replies
in the style of [glow](https://github.com/charmbracelet/glow): one rule under
the header, `│` between columns, no outer box and no rules between rows.
Inline code in a cell is red on grey (`203` on `236`), and bold stays bold.
Replies without a table are left to the built-in renderer.

Before, with the built-in renderer:

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

## What it is

- **A terminal display change.** It hooks the `AssistantMessage` render on
  the terminal surface only, and only for replies that contain a table.
- **Display only.** The stored message and what the model sees are
  unchanged; the mod redraws the text it is given.
- **Shorter tables.** Measured on one machine, a table takes about 25-33%
  fewer rows than the boxed version at 80 to 100 columns.
- **Fast.** Measured on one machine, laying out a 3-row table took about
  0.02 ms and a 40-row table about 0.23 ms, offline. Live in a session, a
  render averaged 1.1 ms, with a 3 ms maximum.
- **Switchable.** `/compact-tables off` hands tables back to the built-in
  renderer without unloading the mod.

## What it is not

- **Not a theme.** It changes tables only; prose, headings, lists and code
  blocks go through Claude Code's own markdown renderer.
- **Not a markdown renderer for cells.** Only `**bold**` and `` `code` ``
  are styled inside a cell; everything else is shown as written.
- **Not for other surfaces.** The desktop app, the web app and IDE
  extensions keep their own tables.

## When not to use

- **Your tables hold wide characters** (CJK text, emoji) → keep the
  built-in renderer. The mod counts characters, not terminal columns, so
  those columns come out misaligned.
- **Your cells hold links or italics** → keep the built-in renderer. The
  mod shows `[text](url)` and `*text*` as raw markdown.
- **You want boxed tables** → don't install it, or run
  `/compact-tables off`.

**Negative example:** a reply that compares CJK place names with emoji
status icons in a table will not line up with this mod; turn it off with
`/compact-tables off` for that session.

## Install

The mod needs Claude Code 2.1.326 or later. The mod API is early access,
so a later Claude Code may change it.

Clone the repo, then start Claude Code with the mod's folder:

```bash
git clone https://github.com/acfatah/skills.git
claude --plugin-dir <clone>/mods/compact-tables
```

To load it in every session, set `CLAUDE_CODE_PLUGIN_DIRS` in the `env`
block of `~/.claude/settings.json`, inside the existing top-level object:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "<clone>/mods/compact-tables"
  }
}
```

The skills CLI (`bunx skills add`) does not install mods, and there is no
marketplace entry yet, so `/plugin install` does not find it.

## Usage

### How it loads

- **Automatically.** Once the folder is loaded, every terminal reply that
  contains a markdown table is drawn by the mod. There is nothing to ask
  for.
- **Tables only.** A reply with no table, or with a table only inside a
  code fence, goes to the built-in renderer unchanged.
- **Nothing asks back.** The mod has no prompts and no settings file.

### The `/compact-tables` command

- **`/compact-tables`:** shows whether it is on, and stats for this load:
  message renders seen, renders drawn by the mod, tables drawn, rows
  compact against an estimate for boxed, and hook time per table render
  (average and maximum).
- **`/compact-tables off`** and **`/compact-tables on`:** turn the mod off
  or on. New and redrawn replies follow the switch.
- **`/compact-tables reset`:** sets the stats back to zero.

### Example prompts

- **See it:** "Compare SQLite, Postgres and DuckDB in a table: setup,
  concurrency, best fit."
- **Check it:** `/compact-tables` after a few table replies, to see the
  rows saved and the render time.
- **Switch:** `/compact-tables off`, then ask for the same table again to
  compare with the built-in renderer.
- **Start over:** `/compact-tables reset` before a test run.

### Checks

Run these from the repo root after a change:

```bash
claude plugin validate mods/compact-tables
claude plugin test mods/compact-tables
bun mods/compact-tables/bench/table.bench.ts
```

- **`validate`** type-checks the hooks module. It warns that the mod has
  no icon; that is expected.
- **`test`** runs `hooks/register.test.tsx`: a reply with a table is drawn
  by the mod, and one without is left to the built-in renderer.
- **The benchmark** prints the time per render for a 3-row table, a 40-row
  table and a reply with no table, then the rows saved at 100, 80 and 60
  columns, and a sample table.

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
- **Its own bullet and gaps.** For a reply with a table, the mod draws the
  `●` bullet and the blank line between a table and the text around it
  itself, so spacing can differ a little from a reply without a table.

The code is in [`hooks/register.tsx`](hooks/register.tsx) and
[`hooks/table.ts`](hooks/table.ts).
