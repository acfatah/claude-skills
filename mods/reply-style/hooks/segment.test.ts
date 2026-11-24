import { expect, test } from 'claude-code/testing'

import { holdsTable, mayHold, segment, unwrap, worthDrawing } from './segment'

const ALL = { tables: true, bullets: true, headings: true, rules: true }
const ONLY = (on: Partial<typeof ALL>) => ({ tables: false, bullets: false, headings: false, rules: false, ...on })
const kinds = (text: string, parts = ALL) => segment(text, parts).map(s => s.kind)
const bodies = (text: string) => {
  const list = segment(text, ALL).find(s => s.kind === 'list')

  return list?.kind === 'list' ? list.items.map(i => i.body) : []
}

test('a bullet list between prose is its own part', () => {
  expect(kinds('Intro.\n\n- one\n- two\n\nOutro.')).toEqual(['markdown', 'list', 'markdown'])
  expect(bodies('- one\n* two\n+ three')).toEqual(['one', 'two', 'three'])
})

test('wrapped lines stay with their item, indented or lazy', () => {
  expect(bodies('- **Bold:** a long\n  line that wraps\n- next')).toEqual(['**Bold:** a long\nline that wraps', 'next'])
  expect(bodies('- a long\nlazy line\n- next')).toEqual(['a long\nlazy line', 'next'])
})

test('nested lists, code and tables stay in the item body, dedented', () => {
  expect(bodies('- top\n  - inner\n    - deepest\n- second')).toEqual(['top\n- inner\n  - deepest', 'second'])
  expect(bodies('- run it:\n\n  ```bash\n  - not a bullet\n  ```\n- done')).toEqual([
    'run it:\n\n```bash\n- not a bullet\n```',
    'done',
  ])
})

test('blank lines: a loose item, and the gap before a part', () => {
  const list = segment('Intro.\n\n- one\n\n- two', ALL)[1]
  expect(list?.kind === 'list' && list.items.map(i => i.blankBefore)).toEqual([false, true])
  expect(list?.blankBefore).toBe(true)
  expect(segment('Intro:\n- one', ALL)[1]?.blankBefore).toBe(false)
})

test('a heading after a list ends it', () => {
  expect(kinds('- one\n### Next')).toEqual(['list', 'heading'])
  expect(kinds('- one\n### Next', ONLY({ bullets: true }))).toEqual(['list', 'markdown'])
})

test('rules and ordered lists are left to the engine', () => {
  expect(kinds('Title\n\n---\n\n- - -\n\n***', ONLY({ bullets: true }))).toEqual(['markdown'])
  expect(kinds('1. First\n   - nested under it\n2. Second')).toEqual(['markdown'])
  expect(kinds('-no space is not a bullet')).toEqual(['markdown'])
})

test('a list after an ordered list is drawn', () => {
  expect(kinds('1. First\n\nThen:\n\n- one')).toEqual(['markdown', 'list'])
})

test('each feature switches on its own', () => {
  const text = '- one\n\n| A | B |\n| --- | --- |\n| 1 | 2 |'
  expect(kinds(text)).toEqual(['list', 'table'])
  expect(kinds(text, ONLY({ tables: true }))).toEqual(['markdown', 'table'])
  expect(kinds(text, ONLY({ bullets: true }))).toEqual(['list', 'markdown'])
  expect(mayHold('- one', ONLY({ tables: true }))).toBe(false)
  expect(mayHold('a | b', ONLY({ bullets: true }))).toBe(false)
  expect(mayHold('## Title', ONLY({ headings: true }))).toBe(true)
  expect(mayHold('## Title', ONLY({ rules: true }))).toBe(false)
  expect(mayHold('Text\n\n---', ONLY({ rules: true }))).toBe(true)
})

test('ATX headings: level, text, closing hashes', () => {
  const heads = (text: string) =>
    segment(text, ALL).flatMap(s => (s.kind === 'heading' ? [[s.level, s.text]] : []))
  expect(heads('# One\n## Two ##\n### `code` three\n#### Four\n###### Six')).toEqual([
    [1, 'One'],
    [2, 'Two'],
    [3, '`code` three'],
    [4, 'Four'],
    [6, 'Six'],
  ])
  expect(heads('## C#')).toEqual([[2, 'C#']])
  expect(kinds('#hashtag, not a heading')).toEqual(['markdown'])
  expect(kinds('```\n## in a fence\n```')).toEqual(['code'])
  expect(kinds('1. Step\n   ## inside the item')).toEqual(['markdown'])
})

test('rules: kept as written; a dash line under text is a setext heading', () => {
  const rule = segment('Text\n\n---', ALL)[1]
  expect(rule).toEqual({ kind: 'rule', text: '---', blankBefore: true })
  expect(kinds('Title\n---')).toEqual(['markdown'])
  expect(kinds('Text\n***')).toEqual(['markdown', 'rule'])
  expect(kinds('---\n### References')).toEqual(['rule', 'heading'])
  expect(kinds('- - -')).toEqual(['rule'])
})

test('a code fence is its own part, with what is inside left unparsed', () => {
  const parts = segment('Intro.\n\n```ts\nconst a = 1\n```\nOutro.', ALL)
  expect(parts.map(p => [p.kind, p.blankBefore])).toEqual([
    ['markdown', false],
    ['code', true],
    ['markdown', false],
  ])
  expect(parts[1]).toEqual({ kind: 'code', text: '```ts\nconst a = 1\n```', blankBefore: true })
  expect(kinds('```\n- in a fence\n| A | B |\n| --- | --- |\n```')).toEqual(['code'])
})

test('an unclosed fence runs to the end of the text', () => {
  expect(segment('Text.\n```\n- one\n\n## two\n\n', ALL).map(p => p.kind)).toEqual(['markdown', 'code'])
  expect(segment('```\na\n\n', ALL)[0]).toEqual({ kind: 'code', text: '```\na', blankBefore: false })
})

test('a fence in an item stays in it; splitting the body yields a code part', () => {
  const [body] = bodies('- run it:\n\n  ```bash\n  ls\n  ```\n- done')
  expect(body).toBe('run it:\n\n```bash\nls\n```')
  expect(kinds(body ?? '')).toEqual(['markdown', 'code'])
})

test('a fence inside an ordered item stays with it', () => {
  expect(kinds('1. Step\n\n   ```\n   ls\n   ```\n2. Next')).toEqual(['markdown'])
  expect(kinds('1. Step\n\n```\nls\n```')).toEqual(['markdown', 'code'])
})

test('a quote is worth drawing only with width on, and never in code', () => {
  const W = { ...ALL, width: true }
  expect(mayHold('> quoted', W)).toBe(true)
  expect(mayHold('> quoted', ALL)).toBe(false)
  expect(worthDrawing(segment('Intro.\n\n> quoted', W), W)).toBe(true)
  expect(worthDrawing(segment('Intro.\n\n> quoted', ALL), ALL)).toBe(false)
  expect(worthDrawing(segment('```\n> not a quote\n```', W), W)).toBe(false)
  expect(worthDrawing(segment('a > b, inline', W), W)).toBe(false)
})

test('a delimiter row takes one dash or more per cell, aligned or not', () => {
  for (const sep of ['| --- | --- |', '| :- | :- |', '|-|-|', '| :-: | -: |', '- | -'])
    expect(kinds(`| A | B |\n${sep}\n| 1 | 2 |`)).toEqual(['table'])
  expect(kinds('| | `x` | y |\n| :- | :- | :- |\n| **a** | b | c |')).toEqual(['table'])
})

test('unwrap joins a paragraph and an item wrapped by hand', () => {
  expect(unwrap('Use **`/fork`**, not `/branch`. It moves\nyou into the copy.')).toBe(
    'Use **`/fork`**, not `/branch`. It moves you into the copy.',
  )
  expect(unwrap('1. **Wait.** The docs don\'t say\n   whether it works.\n2. **Run it**,\n   like this.')).toBe(
    "1. **Wait.** The docs don't say whether it works.\n2. **Run it**, like this.",
  )
  expect(unwrap('Sources: [a](https://a.test),\n[b](https://b.test)')).toBe('Sources: [a](https://a.test), [b](https://b.test)')
})

test('unwrap keeps blocks, items and hard breaks on their own lines', () => {
  const same = [
    'One.\n\nTwo.',
    'Line one  \nline two',
    'Line one\\\nline two',
    'Intro:\n- one\n- two',
    '1. First\n2. Second',
    '1. Step\n     - nested',
    'Title\n---',
    'Title\n===',
    'Text\n***',
    '## Head\nText',
    '> quoted\n> more',
    'Text\n> quoted',
    '| A | B |\n| - | - |',
    '<details>\nText',
    '```\na\nb\n```',
    '1. Step\n\n   ```\n   a\n   b\n   ```',
    'Text.\n\n    code a\n    code b',
  ]
  for (const text of same) expect(unwrap(text)).toBe(text)
})

test('unwrap joins prose either side of code, but never into it', () => {
  expect(unwrap('a\nb\n```\nc\nd\n```\ne\nf')).toBe('a b\n```\nc\nd\n```\ne f')
})

test('a soft line break is worth drawing only with width on', () => {
  const W = { ...ALL, width: true }
  const text = 'A paragraph wrapped\nby hand.'
  expect(mayHold(text, W)).toBe(true)
  expect(mayHold(text, ALL)).toBe(false)
  expect(worthDrawing(segment(text, W), W)).toBe(true)
  expect(worthDrawing(segment(text, ALL), ALL)).toBe(false)
  expect(worthDrawing(segment('One line.\n\nAnother.', W), W)).toBe(false)
  expect(worthDrawing(segment('1. First\n2. Second', W), W)).toBe(false)
})

test('holdsTable finds a table at any indent, and nothing else', () => {
  expect(holdsTable('Intro.\n\n| A | B |\n| :- | :- |\n| 1 | 2 |')).toBe(true)
  expect(holdsTable('1. Step\n\n   | A | B |\n   | --- | --- |')).toBe(true)
  expect(holdsTable('No table | here, just a pipe.')).toBe(false)
  expect(holdsTable('| A | B |\n| - |')).toBe(false)
})

test('a delimiter row must match the header in cells, and hold dashes', () => {
  expect(kinds('| A | B |\n| - |\n| 1 | 2 |')).toEqual(['markdown'])
  expect(kinds('| A |\n-\nText')).toEqual(['markdown'])
  expect(kinds('| A | B |\n| : | : |\n| 1 | 2 |')).toEqual(['markdown'])
})
