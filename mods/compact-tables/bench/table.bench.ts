// Benchmark the table layout: render time, and rows saved against a boxed table.
// Run with: bun mods/compact-tables/bench/table.bench.ts
import { segment, layout, boxedRows } from '../hooks/table.ts'
const small = `Some intro.

| Option | \`main\` history | Cost |
| --- | --- | --- |
| **A. Keep the branch as it is** | Both commits; the second one reverts part of the first | Nothing; matches \`dev\` exactly |
| **B. New branch, one squashed commit** | One clean \`fix(parser)\` commit | New branch name; the old remote branch gets deleted |
| C. Squash-merge on GitHub | One commit | Breaks the repo's merge-commit habit; the reviewer must choose it |

Outro.`
const row = (i: number) => `| Area ${i} | \`/page/${i}\`, Manage, Summary | Notes for row ${i}: widgets, users can manage and customise their own things here |`
const big = 'Intro\n\n| Area | Pages | Notes |\n| --- | --- | --- |\n' + Array.from({ length: 40 }, (_, i) => row(i)).join('\n') + '\n\n' + 'Prose paragraph. '.repeat(200)
const plain = 'Just prose with no table at all. '.repeat(300)
const render = (t: string, cols: number) => segment(t).forEach(s => s.kind === 'table' && layout(s.table, cols))
for (const [name, text] of [['small (3 rows)', small], ['big (40 rows + 3 KB prose)', big], ['no table (10 KB)', plain]] as const) {
  for (let i = 0; i < 200; i++) render(text, 100)
  const N = 2000, t0 = performance.now()
  for (let i = 0; i < N; i++) render(text, 100)
  console.log(`${name}: ${((performance.now() - t0) / N * 1000).toFixed(1)} µs per render`)
}
for (const cols of [100, 80, 60]) {
  for (const [name, text] of [['small', small], ['big', big]] as const) {
    const t = segment(text).find(s => s.kind === 'table')!
    if (t.kind !== 'table') continue
    const mine = layout(t.table, cols).length, boxed = boxedRows(t.table, cols)
    console.log(`${cols} cols, ${name}: compact ${mine} rows, boxed ~${boxed}, saved ${boxed - mine} (${Math.round((boxed - mine) / boxed * 100)}%)`)
  }
}
const t = segment(small).find(s => s.kind === 'table')!
if (t.kind === 'table') console.log('\n' + layout(t.table, 97).map(l => l.map(s => s.text).join('').trimEnd()).join('\n'))
