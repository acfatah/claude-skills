// Pure table logic: split a reply into markdown and table segments, then lay a
// table out as lines of styled spans. No engine imports, so a benchmark or a
// test can run it alone.

export type Style = 'plain' | 'bold' | 'code' | 'rule'
export type Span = { text: string; style: Style }
export type Line = Span[]
export type Table = { header: string[]; rows: string[][] }
export type Segment = { kind: 'markdown'; text: string } | { kind: 'table'; table: Table }

const SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
const FENCE = /^\s*(```|~~~)/

const isRow = (line: string) => line.trim().startsWith('|')

// Splits on unescaped pipes, dropping the outer empty cells.
export const splitRow = (line: string): string[] => {
  const cells: string[] = []
  let cell = ''
  let inCode = false
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '\\' && body[i + 1] === '|') {
      cell += '|'
      i++
    } else if (ch === '`') {
      inCode = !inCode
      cell += ch
    } else if (ch === '|' && !inCode) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell.trim())

  return cells
}

export const segment = (text: string): Segment[] => {
  const lines = text.split('\n')
  const out: Segment[] = []
  let buf: string[] = []
  let inFence = false
  const flush = () => {
    const md = buf.join('\n').replace(/^\n+|\n+$/g, '')
    if (md.trim()) out.push({ kind: 'markdown', text: md })
    buf = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (FENCE.test(line)) inFence = !inFence
    const next = lines[i + 1]
    if (!inFence && isRow(line) && next !== undefined && SEPARATOR.test(next)) {
      flush()
      const header = splitRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && isRow(lines[i] ?? '')) {
        const cells = splitRow(lines[i] ?? '')
        rows.push(header.map((_, c) => cells[c] ?? ''))
        i++
      }
      i--
      out.push({ kind: 'table', table: { header, rows } })
    } else {
      buf.push(line)
    }
  }
  flush()

  return out
}

export const hasTable = (text: string) => segment(text).some(s => s.kind === 'table')

// Inline markup in a cell: `code` and **bold**; anything else is plain.
export const spans = (cell: string): Span[] => {
  const out: Span[] = []
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g
  let last = 0
  for (let m = re.exec(cell); m; m = re.exec(cell)) {
    if (m.index > last) out.push({ text: cell.slice(last, m.index), style: 'plain' })
    out.push(m[1] !== undefined ? { text: ` ${m[1]} `, style: 'code' } : { text: m[2] ?? '', style: 'bold' })
    last = m.index + m[0].length
  }
  if (last < cell.length) out.push({ text: cell.slice(last), style: 'plain' })

  return out
}

// Words that keep their style; a code span stays one unit.
type Word = { text: string; style: Style; space: boolean }

const words = (cell: string): Word[] => {
  const out: Word[] = []
  for (const s of spans(cell)) {
    if (s.style === 'code') {
      out.push({ text: s.text, style: s.style, space: true })
      continue
    }
    const parts = s.text.split(/(\s+)/)
    let space = /^\s/.test(s.text) || out.length === 0
    for (const p of parts) {
      if (p === '') continue
      if (/^\s+$/.test(p)) {
        space = true
        continue
      }
      out.push({ text: p, style: s.style, space })
      space = false
    }
  }

  return out
}

const width = (cell: string) => spans(cell).reduce((n, s) => n + s.text.length, 0)

// Wraps a cell to `w` columns; each line is a list of spans.
export const wrap = (cell: string, w: number): Line[] => {
  const lines: Line[] = []
  let line: Line = []
  let used = 0
  const push = () => {
    lines.push(line)
    line = []
    used = 0
  }
  for (const word of words(cell)) {
    let text = word.text
    const gap = used > 0 && word.space ? 1 : 0
    if (used + gap + text.length > w && used > 0) push()
    else if (gap) {
      line.push({ text: ' ', style: 'plain' })
      used += 1
    }
    while (text.length > w) {
      line.push({ text: text.slice(0, w - used), style: word.style })
      text = text.slice(w - used)
      push()
    }
    line.push({ text, style: word.style })
    used += text.length
  }
  if (line.length || lines.length === 0) push()

  return lines
}

// Column widths that fit `avail`: narrow columns keep their natural width,
// the rest share what is left evenly.
export const fit = (natural: number[], avail: number): number[] => {
  const total = natural.reduce((a, b) => a + b, 0)
  if (total <= avail) return natural
  const out = [...natural]
  let left = avail
  let open = natural.map((_, i) => i)
  let changed = true
  while (changed && open.length) {
    changed = false
    const share = Math.floor(left / open.length)
    for (const i of open) {
      const nat = natural[i] ?? 0
      if (nat <= share) {
        out[i] = nat
        left -= nat
        open = open.filter(j => j !== i)
        changed = true
      }
    }
  }
  const share = Math.max(4, Math.floor(left / Math.max(1, open.length)))
  for (const i of open) out[i] = share

  return out
}

const pad = (line: Line, w: number): Line => {
  const used = line.reduce((n, s) => n + s.text.length, 0)

  return used < w ? [...line, { text: ' '.repeat(w - used), style: 'plain' }] : line
}

const SEP = ' │ '

// Lays a table out at `columns` cells: header, one rule, then the rows.
export const layout = (table: Table, columns: number): Line[] => {
  const n = table.header.length
  const all = [table.header, ...table.rows]
  const natural = table.header.map((_, c) => Math.max(1, ...all.map(r => width(r[c] ?? ''))))
  const widths = fit(natural, Math.max(n * 4, columns - SEP.length * (n - 1)))
  const out: Line[] = []
  const row = (cells: string[]) => {
    const wrapped = cells.map((cell, c) => wrap(cell, widths[c] ?? 4))
    const height = Math.max(...wrapped.map(w => w.length))
    for (let r = 0; r < height; r++) {
      const line: Line = []
      wrapped.forEach((w, c) => {
        if (c > 0) line.push({ text: SEP, style: 'rule' })
        line.push(...(c === n - 1 ? (w[r] ?? []) : pad(w[r] ?? [], widths[c] ?? 4)))
      })
      out.push(line)
    }
  }
  row(table.header)
  out.push([{ text: widths.map(w => '─'.repeat(w)).join('─┼─'), style: 'rule' }])
  for (const r of table.rows) row(r)

  return out
}

// Rows the built-in boxed renderer takes for the same table, as an estimate:
// a border above, below, under the header and between rows, and one space of
// padding each side of a cell.
export const boxedRows = (table: Table, columns: number): number => {
  const n = table.header.length
  const all = [table.header, ...table.rows]
  const natural = table.header.map((_, c) => Math.max(1, ...all.map(r => width(r[c] ?? ''))))
  const widths = fit(natural, Math.max(n * 4, columns - 3 * n - 1))
  const height = (cells: string[]) => Math.max(...cells.map((cell, c) => wrap(cell, widths[c] ?? 4).length))

  return all.reduce((sum, r) => sum + height(r), 0) + all.length + 1
}
