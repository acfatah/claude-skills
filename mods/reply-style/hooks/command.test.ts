import { expect, test } from 'claude-code/testing'

import { FEATURES, parse } from './command'

test('no arguments show the stats', () => {
  expect(parse(undefined)).toEqual({ kind: 'stats' })
  expect(parse('  ')).toEqual({ kind: 'stats' })
})

test('reset, and on or off for every feature', () => {
  expect(parse('reset')).toEqual({ kind: 'reset' })
  expect(parse('off')).toEqual({ kind: 'set', features: FEATURES, on: false })
  expect(parse('ON')).toEqual({ kind: 'set', features: FEATURES, on: true })
})

test('on or off for one feature', () => {
  expect(parse('tables off')).toEqual({ kind: 'set', features: ['tables'], on: false })
})

test('anything else shows the usage', () => {
  for (const args of ['tables', 'reset now', 'off tables', 'colors on', 'tables on now']) {
    expect(parse(args)).toEqual({ kind: 'usage' })
  }
})
