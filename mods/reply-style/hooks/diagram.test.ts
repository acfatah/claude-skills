import { expect, test } from 'claude-code/testing'

import { toUnicode } from './diagram'

const draw = (...lines: string[]) => toUnicode(lines.join('\n')).split('\n')

test('a box with an arrow to another box', () => {
  expect(draw('+---+     +---+', '| a | --> | b |', '+---+     +-+-+', '            |', '            v')).toEqual([
    '┌───┐     ┌───┐',
    '│ a │ ──▶ │ b │',
    '└───┘     └─┬─┘',
    '            │',
    '            ▼',
  ])
})

test('trees drawn with +--, |-- and `--', () => {
  expect(draw('root', '  |', '  +-- one', '  |', '  +-- two')).toEqual(['root', '  │', '  ├── one', '  │', '  └── two'])
  expect(draw('src/', '|-- a.ts', '|   `-- b.ts', '`-- c.ts')).toEqual(['src/', '├── a.ts', '│   └── b.ts', '└── c.ts'])
})

test('arrows on a line, either way and up', () => {
  expect(draw('a -> b <-- c')).toEqual(['a ─▶ b ◀── c'])
  expect(draw('  ^', '  |', '  +--')).toEqual(['  ▲', '  │', '  └──'])
})

test('text in labels is left as written', () => {
  const text = 'feat/formal-letter(-data) x->y C++ a + b --force 3-5 very ^top a - b'
  expect(toUnicode(text)).toBe(text)
})

test('a bare line loses its plus signs, and widths never change', () => {
  expect(toUnicode('+-----+')).toBe('───────')
  const text = '+--+\n|  |\n+--+ -> x'
  const out = toUnicode(text)
  expect(out.split('\n').map(l => [...l].length)).toEqual(text.split('\n').map(l => l.length))
})

test('unicode already in the block, and = lines, stay as they are', () => {
  expect(toUnicode('┌─┐ ==> a')).toBe('┌─┐ ==> a')
})
