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
- **Headings:** glow's shapes in the terminal's default colour, bold: `#`
  with a space each side, `##` as `█ Title` over a 75-column rule, `###` as
  `▌ Title`, and `####` as `│ Title`, not bold. Deeper levels are bold
  alone. A heading right under a rule keeps no blank line between them.
- **Rules:** a `---`, `***` or `___` line is kept as written and drawn dim.
- **Width:** in a reply the mod draws, prose wraps at 75 columns from the
  text column, as in replies the built-in renderer draws, or at the
  terminal's width when that is narrower. Paragraphs, bullet text,
  headings, quotes and ordered lists are capped; code blocks and tables
  keep the full width. A reply with a quote is always drawn, so the quote
  is capped even when nothing else in the reply changes.

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

Headings, as Claude writes them, then as the mod draws them (the rule is
75 columns, shortened here):

```
## Top level

### Subsection
```

```
█ Top level
──────────────────────────────

▌ Subsection
```

## What it is

- **A terminal display change.** It hooks the `AssistantMessage` render on
  the terminal surface only, and only for replies with a part it
  changes: a table, a bullet list, a heading or a rule.
- **Display only.** The stored message and what the model sees are
  unchanged; the mod redraws the text it is given.
- **Shorter tables.** Measured on one machine, a table takes about 25-33%
  fewer rows than the boxed version at 80 to 100 columns.
- **Fast.** Measured on one machine, offline, across runs: a 3-row table
  took 0.02-0.06 ms to lay out, a 40-row table 0.23-0.62 ms, and a 30-item
  nested list 0.08-0.15 ms. Live in a session, a table render averaged
  1.1 ms, with a 3 ms maximum; that was measured before bullets, headings
  and rules were added.
- **Switchable.** `/reply-style tables off` hands tables back to the
  built-in renderer without unloading the mod; `/reply-style off` does it
  for every feature. `/reply-style width off` lets prose run the full
  width again.

## What it is not

- **Not a theme.** It changes only its features' parts; prose, ordered
  lists, quotes and code blocks go through Claude Code's own markdown
  renderer.
- **Not for setext headings.** A heading underlined with `===` or `---` is
  left to the built-in renderer; only `#` headings are drawn.
- **Not a list renderer for every list.** Bullets nested under an ordered
  (`1.`) item stay with that item, so the built-in renderer draws them with
  `-`.
- **Not a markdown renderer for cells.** Only `**bold**` and `` `code` ``
  are styled inside a cell; everything else is shown as written.
- **Not for other surfaces.** The desktop app, the web app and IDE
  extensions keep their own tables, lists, headings and rules.

## When not to use

- **Your tables hold wide characters** (CJK text, emoji) → keep the
  built-in renderer. The mod counts characters, not terminal columns, so
  those columns come out misaligned.
- **Your cells hold links or italics** → keep the built-in renderer. The
  mod shows `[text](url)` and `*text*` as raw markdown.
- **You want boxed tables** → run `/reply-style tables off`.
- **You want `-` bullets back** → run `/reply-style bullets off`.
- **You want the built-in headings or rules** → run
  `/reply-style headings off` or `/reply-style rules off`.
- **You want prose to use the whole width** → run
  `/reply-style width off`.

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
  load: message renders seen, renders drawn by the mod, tables, bullet
  lists, headings and rules drawn, table rows compact against an estimate
  for boxed, and hook time per drawn render (average and maximum).
- **`/reply-style <feature> off`** and **`/reply-style <feature> on`:**
  turn one feature off or on, where `<feature>` is `tables`, `bullets`,
  `headings`, `rules` or `width`. New and redrawn replies follow the
  switch.
- **`/reply-style width off`:** lets prose in replies the mod draws run
  the full terminal width; `width on` caps it at 75 columns again.
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
- **See headings:** "Explain git rebase, with a section for each step."
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
  reply with a table, bullets, headings or a rule is drawn by the mod,
  that one with none of them is left to the built-in renderer, and that
  prose is capped at 75 columns while code is not.
  `hooks/segment.test.ts` checks how a reply is split: nested and wrapped
  items, heading levels, rules and setext headings, code fences, ordered
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
- **A bug shows in most replies.** Bullets and headings put most replies
  through the mod, so a mistake in its code shows nearly everywhere.
  Turning the feature off, such as `/reply-style bullets off`, is the way
  out until it is fixed.
- **A `---` right under text is a heading.** Markdown reads it as a setext
  underline, so the line above becomes a heading. Put a blank line before
  a rule.
- **Heading text styles code only.** Inline code in a heading is red on
  grey, and `**` markers are dropped, since the heading is bold already.
  Italics and links in a heading show as raw markdown.
- **Heading colours are set in code.** `HEAD_COLOR` in
  `hooks/register.tsx` holds a `color` and `backgroundColor` per level,
  all empty for now; the h2 rule takes the h2 `color`. Its comment gives
  glow's values (blue `#00afff`, and h1 as `#080808` on blue). There is no
  command or setting for them.
- **Indents count spaces.** A tab counts as one column, so a list indented
  with tabs can nest differently from the built-in renderer.
- **Loose items keep a blank line.** A blank line between two items stays
  in the drawing, as it does in the source.
- **The cap follows the terminal on resize.** A width change redraws the
  reply once the resize settles, so the prose rewraps at the new width.
- **The cap is the mod's only in replies it draws.** A reply with nothing
  for the mod to change, and no quote, goes to the built-in renderer, so
  its prose follows that renderer's own width.
- **Quotes are still the built-in renderer's.** The mod only caps their
  width; the built-in renderer draws the `>` bar and the text inside.
- **Code inside an ordered item is capped.** A fence indented under a
  `1.` item stays with that item's prose, so it wraps at 75 columns too.
- **Task items are plain items.** `- [ ] task` draws as `•` followed by
  `[ ] task`.

The code is in [`hooks/register.tsx`](hooks/register.tsx),
[`hooks/segment.ts`](hooks/segment.ts), [`hooks/table.ts`](hooks/table.ts)
and [`hooks/command.ts`](hooks/command.ts).
