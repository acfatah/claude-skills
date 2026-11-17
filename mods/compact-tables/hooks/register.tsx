import type { Register } from 'claude-code'

import { boxedRows, layout, segment } from './table'
import type { Line } from './table'

// glow-style.json: inline code 203 on 236.
const CODE_FG = '#ff5f5f'
const CODE_BG = '#303030'
const BULLET = 2

export const register: Register = on => {
  // Measurements for this load; a reload starts them over.
  let isOn = true
  let calls = 0
  let drawn = 0
  let tables = 0
  let rowsMine = 0
  let rowsBoxed = 0
  let totalMs = 0
  let maxMs = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'compact-tables',
      description: 'Compact tables: show stats, or turn them on or off (on|off|reset)',
    })

    return next(e)
  })

  on('command.run', { command: 'compact-tables' }, async (_$, e) => {
    const arg = (e.args ?? '').trim()
    if (arg === 'on' || arg === 'off') {
      isOn = arg === 'on'

      return { text: `Compact tables ${arg}. New and redrawn replies use it.` }
    }
    if (arg === 'reset') {
      calls = drawn = tables = rowsMine = rowsBoxed = totalMs = maxMs = 0

      return { text: 'Compact tables: stats reset.' }
    }
    const avg = drawn ? (totalMs / drawn).toFixed(2) : '0'
    const saved = rowsBoxed - rowsMine

    return {
      text: [
        `Compact tables: ${isOn ? 'on' : 'off'}`,
        `- Message renders seen: ${calls}; with a table, drawn by the mod: ${drawn}`,
        `- Tables drawn: ${tables} (counted per render, so streaming counts repeats)`,
        `- Rows: ${rowsMine} compact vs about ${rowsBoxed} boxed, ${saved} saved`,
        `- Hook time per table render: avg ${avg} ms, max ${maxMs} ms`,
      ].join('\n'),
    }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    calls++
    if (!isOn || e.surface !== 'terminal' || !e.props.text.includes('|')) return next(e)

    const started = Date.now()
    const parts = segment(e.props.text)
    if (!parts.some(p => p.kind === 'table')) return next(e)

    const { Box, Text, Markdown } = $.ui.resolve(e)
    const columns = (e.viewport?.columns ?? 80) - BULLET - 1

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

    const body = parts.map((p, i) => {
      const gap = i < parts.length - 1 ? 1 : 0
      if (p.kind === 'markdown') {
        return (
          <Box marginBottom={gap}>
            <Markdown text={p.text} />
          </Box>
        )
      }
      const lines = layout(p.table, columns)
      tables++
      rowsMine += lines.length
      rowsBoxed += boxedRows(p.table, columns)

      return (
        <Box flexDirection="column" marginBottom={gap}>
          {lines.map(line)}
        </Box>
      )
    })

    const ms = Date.now() - started
    drawn++
    totalMs += ms
    maxMs = Math.max(maxMs, ms)

    return (
      <Box flexDirection="row">
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
