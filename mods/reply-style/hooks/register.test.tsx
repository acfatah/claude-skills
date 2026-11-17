import { expect, test } from 'claude-code/testing'

const TEXT = [
  'Intro line.',
  '',
  '| Option | Cost |',
  '| --- | --- |',
  '| **A** | uses `dev` |',
  '| B | none |',
  '',
  'Outro.',
].join('\n')

const MSG = (text: string) =>
  ({
    plugin: 'reply-style',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: 80, rows: 40 },
  }) as const

test('a reply with a table is drawn by the mod, with a header rule', async $ => {
  const ui = await $.ui.mount(MSG(TEXT))

  expect(await ui.find({ type: 'Markdown' })).toBeDefined()
  expect((await ui.findAll({ type: 'Markdown' })).length).toBe(2)
  expect(await ui.find({ text: /─┼─/ })).toBeDefined()
  expect(await ui.find({ text: /\bdev\b/ })).toBeDefined()
  await ui.unmount()
})

test('a reply without a table or a bullet is left to the engine', async $ => {
  const ui = await $.ui.mount(MSG('No table | here, just a pipe.\n\n1. An ordered item'))

  expect(await ui.find({ text: /─┼─/ })).toBeUndefined()
  expect(await ui.find({ text: /•/ })).toBeUndefined()
  await ui.unmount()
})

test('headings are drawn in the glow style, an h2 over a 75-column rule', async $ => {
  const ui = await $.ui.mount(MSG('## Top\n\nText.\n\n### Sub\n\n#### Third'))

  expect(await ui.find({ type: 'Text', text: '█ Top' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '─'.repeat(75) })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '▌ Sub' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '│ Third' })).toBeDefined()
  expect(await ui.find({ text: /#/ })).toBeUndefined()
  await ui.unmount()
})

test('a rule is kept as written, dim', async $ => {
  const ui = await $.ui.mount(MSG('Text.\n\n---\n### References'))

  const rule = await ui.find({ type: 'Text', text: /^---$/ })
  expect(rule?.props.dimColor).toBe(true)
  expect(await ui.find({ type: 'Text', text: '▌ References' })).toBeDefined()
  await ui.unmount()
})

test('bullets are drawn as •, nested ones too, with their text as markdown', async $ => {
  const ui = await $.ui.mount(MSG('Intro.\n\n- **One:** first\n  - inner\n- two'))

  expect((await ui.findAll({ type: 'Text', text: /^• $/ })).length).toBe(3)
  expect(await ui.find({ type: 'Markdown', text: '**One:** first' })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', text: 'inner' })).toBeDefined()
  expect(await ui.find({ text: /^- / })).toBeUndefined()
  await ui.unmount()
})
