import { expect, test } from 'claude-code/testing'

import { mayHold, segment } from './segment'

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

test('fences, rules and ordered lists are left to the engine', () => {
  expect(kinds('```\n- in a fence\n```')).toEqual(['markdown'])
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
  expect(kinds('```\n## in a fence\n```')).toEqual(['markdown'])
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
