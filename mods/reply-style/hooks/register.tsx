import type { Register } from 'claude-code'

import { FEATURES, parse, USAGE } from './command'
import type { Feature } from './command'
import { mayHold, segment } from './segment'
import type { Item, Segment } from './segment'
import { boxedRows, layout, spans } from './table'
import type { Line } from './table'

// glow-style.json: inline code 203 on 236, list items `• `, indented 2;
// h1 with a space each side, h2 `█ ` over a 75-column rule, h3 `▌ `, h4
// `│ ` and not bold.
const CODE_FG = '#ff5f5f'
const CODE_BG = '#303030'
// Heading colours per level; an empty entry keeps the terminal's default.
// glow's: blue 39 for every level, `{ color: '#00afff' }`, and h1 232 on
// 39, `{ color: '#080808', backgroundColor: '#00afff' }`. An h2's rule
// takes the h2 `color`.
type HeadColor = { color?: string; backgroundColor?: string }
const HEAD_COLOR: Record<number, HeadColor> = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} }
const ITEM = '• '
const BULLET = 2
const H2_RULE = 75
const PREFIX: Record<number, string> = { 1: ' ', 2: '█ ', 3: '▌ ', 4: '│ ' }

export const register: Register = on => {
  // Switches and measurements for this load; a reload starts them over.
  const isOn: Record<Feature, boolean> = { tables: true, bullets: true, headings: true, rules: true }
  let calls = 0
  let drawn = 0
  let tables = 0
  let rowsMine = 0
  let rowsBoxed = 0
  let lists = 0
  let headings = 0
  let rules = 0
  let totalMs = 0
  let maxMs = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'reply-style',
      description: `Reply style: show stats, turn features on or off ([${FEATURES.join('|')}] on|off), or reset`,
    })

    return next(e)
  })

  on('command.run', { command: 'reply-style' }, async (_$, e) => {
    const cmd = parse(e.args)
    if (cmd.kind === 'usage') return { text: USAGE }
    if (cmd.kind === 'reset') {
      calls = drawn = tables = rowsMine = rowsBoxed = lists = headings = rules = totalMs = maxMs = 0

      return { text: 'Reply style: stats reset.' }
    }
    if (cmd.kind === 'set') {
      for (const f of cmd.features) isOn[f] = cmd.on
      const which = cmd.features.length === 1 ? cmd.features[0] : 'all features'

      return { text: `Reply style: ${which} ${cmd.on ? 'on' : 'off'}. New and redrawn replies use it.` }
    }
    const avg = drawn ? (totalMs / drawn).toFixed(2) : '0'
    const saved = rowsBoxed - rowsMine

    return {
      text: [
        `Reply style: ${FEATURES.map(f => `${f} ${isOn[f] ? 'on' : 'off'}`).join(', ')}`,
        `- Message renders seen: ${calls}; drawn by the mod: ${drawn}`,
        `- Drawn: ${tables} tables, ${lists} bullet lists, ${headings} headings, ${rules} rules (counted per render, so streaming counts repeats)`,
        `- Table rows: ${rowsMine} compact vs about ${rowsBoxed} boxed, ${saved} saved`,
        `- Hook time per drawn render: avg ${avg} ms, max ${maxMs} ms`,
      ].join('\n'),
    }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    calls++
    const text = e.props.text
    if (e.surface !== 'terminal' || !mayHold(text, isOn)) return next(e)

    const started = Date.now()
    const parts = segment(text, isOn)
    if (parts.every(p => p.kind === 'markdown')) return next(e)

    const { Box, Text, Markdown } = $.ui.resolve(e)

    const line = (l: Line, i: number) => (
      <Text key={`l${i}`}>
        {l.map(s =>
          s.style === 'code' ? (
            <Text color={CODE_FG} backgroundColor={CODE_BG}>{s.text}</Text>
          ) : s.style === 'bold' ? (
            <Text bold>{s.text}</Text>
          ) : s.style === 'rule' ? (
            <Text dimColor>{s.text}</Text>
          ) : (
            s.text
          ),
        )}
      </Text>
    )

    // A blank line between two parts where the reply has one, always above
    // a heading (unless right under a rule, as References is), and always
    // around a table, as before bullets were drawn.
    const gapAbove = (all: Segment[], i: number) => {
      const p = all[i]
      const prev = all[i - 1]
      if (!p || !prev) return 0
      if (p.kind === 'heading' && prev.kind === 'rule') return p.blankBefore ? 1 : 0

      return p.blankBefore || p.kind === 'heading' || p.kind === 'table' || prev.kind === 'table' ? 1 : 0
    }

    // A heading's text, with inline code kept red on grey.
    const headingText = (level: number, text: string) => {
      const h1 = level === 1
      const parts = spans(text).map((s, i) =>
        s.style === 'code' ? (
          <Text key={`s${i}`} color={CODE_FG} backgroundColor={CODE_BG}>{s.text}</Text>
        ) : (
          s.text
        ),
      )

      return (
        <Text {...HEAD_COLOR[level]} bold={level !== 4}>
          {PREFIX[level] ?? ''}
          {parts}
          {h1 ? ' ' : ''}
        </Text>
      )
    }

    const item = (it: Item, i: number, columns: number) => (
      <Box key={`i${i}`} flexDirection="row" marginTop={i > 0 && it.blankBefore ? 1 : 0}>
        <Box width={ITEM.length} flexShrink={0}>
          <Text>{ITEM}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          {draw(segment(it.body, isOn), columns - ITEM.length)}
        </Box>
      </Box>
    )

    // Draws parts at `columns` wide; an item's body is drawn the same way,
    // so nested lists, and tables or code in an item, work at any depth.
    const draw = (all: Segment[], columns: number) =>
      all.map((p, i) => {
        const key = `p${i}`
        const top = gapAbove(all, i)
        if (p.kind === 'markdown') {
          return (
            <Box key={key} marginTop={top}>
              <Markdown text={p.text} />
            </Box>
          )
        }
        if (p.kind === 'heading') {
          headings++

          return (
            <Box key={key} flexDirection="column" marginTop={top}>
              {headingText(p.level, p.text)}
              {p.level === 2 ? <Text color={HEAD_COLOR[2]?.color}>{'─'.repeat(Math.min(H2_RULE, columns))}</Text> : null}
            </Box>
          )
        }
        if (p.kind === 'rule') {
          rules++

          return (
            <Box key={key} marginTop={top}>
              <Text dimColor>{p.text}</Text>
            </Box>
          )
        }
        if (p.kind === 'list') {
          lists++

          return (
            <Box key={key} flexDirection="column" marginTop={top}>
              {p.items.map((it, j) => item(it, j, columns))}
            </Box>
          )
        }
        const lines = layout(p.table, columns)
        tables++
        rowsMine += lines.length
        rowsBoxed += boxedRows(p.table, columns)

        return (
          <Box key={key} flexDirection="column" marginTop={top}>
            {lines.map(line)}
          </Box>
        )
      })

    const body = draw(parts, (e.viewport?.columns ?? 80) - BULLET - 1)

    const ms = Date.now() - started
    drawn++
    totalMs += ms
    maxMs = Math.max(maxMs, ms)

    // The engine's reply keeps a blank line above every block, under a tool
    // row or the prompt; a rewrite replaces it, so the mod draws its own.
    return (
      <Box key="reply" flexDirection="row" marginTop={1}>
        <Box width={BULLET} flexShrink={0}>
          <Text>{e.props.isFirstOfReply ? '● ' : '  '}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          {body}
        </Box>
      </Box>
    )
  })
}
