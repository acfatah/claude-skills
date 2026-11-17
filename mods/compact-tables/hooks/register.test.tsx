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
    plugin: 'compact-tables',
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

test('a reply without a table is left to the engine', async $ => {
  const ui = await $.ui.mount(MSG('No table | here, just a pipe.'))

  expect(await ui.find({ text: /─┼─/ })).toBeUndefined()
  await ui.unmount()
})
