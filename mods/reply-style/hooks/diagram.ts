// Redraws an ASCII diagram with Unicode box-drawing glyphs, one cell for one
// cell, so the columns never move. No engine imports, so a test can run it
// alone.
//
// Only lines change: `-` runs, `|`, `+` junctions, a backtick tree corner
// and the arrowheads on a line. Each junction takes its glyph from its
// neighbours. Text is left as written: a `-` or `+` that touches a letter or
// a digit, such as `formal-letter`, `x->y` or `C++`, is not a line.

// Up, down, left, right: which neighbours a cell joins.
type Joins = { u: boolean; d: boolean; l: boolean; r: boolean }

const GLYPH: Record<string, string> = {
  udlr: '┼',
  udl: '┤',
  udr: '├',
  ulr: '┴',
  dlr: '┬',
  ud: '│',
  lr: '─',
  ul: '┘',
  ur: '└',
  dl: '┐',
  dr: '┌',
  u: '│',
  d: '│',
  l: '─',
  r: '─',
}

const ALNUM = /[\p{L}\p{N}_]/u

const glyph = (j: Joins) => GLYPH[`${j.u ? 'u' : ''}${j.d ? 'd' : ''}${j.l ? 'l' : ''}${j.r ? 'r' : ''}`]

export const toUnicode = (text: string): string => {
  const rows = text.split('\n').map(l => [...l])
  const at = (r: number, c: number) => rows[r]?.[c] ?? ' '
  const isWord = (ch: string) => ALNUM.test(ch)

  // Cells on a horizontal line: a run of `-` and `+`, with an optional `<`
  // before it and `>` after it, that has two dashes, a `+` or an arrowhead,
  // and touches no letter or digit at either end.
  const line = rows.map(row => row.map(() => false))
  rows.forEach((row, r) => {
    let c = 0
    while (c < row.length) {
      if (row[c] !== '-' && row[c] !== '+' && row[c] !== '<') {
        c++
        continue
      }
      let start = c
      let end = c
      if (row[end] === '<') end++
      while (row[end] === '-' || row[end] === '+') end++
      if (row[end] === '>') end++
      // A lone `<` or `>` with no dash is text, as is a run of `+` alone.
      const run = row.slice(start, end).join('')
      const dashes = run.split('-').length - 1
      const arrow = run.startsWith('<') || run.endsWith('>')
      const ok =
        dashes > 0 &&
        (dashes >= 2 || run.includes('+') || arrow) &&
        !isWord(at(r, start - 1)) &&
        !isWord(at(r, end))
      if (ok) for (; start < end; start++) line[r]![start] = true
      c = Math.max(end, c + 1)
    }
  })

  const onLine = (r: number, c: number) => line[r]?.[c] === true
  // `^` and `v` are arrowheads when they sit on a vertical line and touch no
  // letter or digit beside them.
  const loneLetter = (r: number, c: number) => !isWord(at(r, c - 1)) && !isWord(at(r, c + 1))
  const upArrow = (r: number, c: number) =>
    at(r, c) === '^' && loneLetter(r, c) && (at(r + 1, c) === '|' || at(r + 1, c) === '+')
  const downArrow = (r: number, c: number) =>
    at(r, c) === 'v' && loneLetter(r, c) && (at(r - 1, c) === '|' || at(r - 1, c) === '+')
  // A neighbour that carries a vertical line into this cell.
  const joinsUp = (r: number, c: number) => {
    const ch = at(r - 1, c)

    return ch === '|' || ch === '+' || upArrow(r - 1, c)
  }
  const joinsDown = (r: number, c: number) => {
    const ch = at(r + 1, c)

    return ch === '|' || ch === '+' || downArrow(r + 1, c)
  }
  const joinsLeft = (r: number, c: number) => onLine(r, c - 1) && at(r, c - 1) !== '>'
  const joinsRight = (r: number, c: number) => onLine(r, c + 1) && at(r, c + 1) !== '<'

  return rows
    .map((row, r) =>
      row
        .map((ch, c) => {
          if (ch === '-') return onLine(r, c) ? '─' : ch
          if (ch === '>') return onLine(r, c) ? '▶' : ch
          if (ch === '<') return onLine(r, c) ? '◀' : ch
          if (ch === '^') return upArrow(r, c) ? '▲' : ch
          if (ch === 'v') return downArrow(r, c) ? '▼' : ch
          // A `|` is a whole vertical stroke, so `|--` is `├──` even at the
          // top or bottom of a tree; a tree's last corner is `` `-- `` or
          // `+--`.
          if (ch === '|') return glyph({ u: true, d: true, l: joinsLeft(r, c), r: joinsRight(r, c) }) ?? ch
          if (ch === '+') {
            const h = onLine(r, c)
            const j = { u: joinsUp(r, c), d: joinsDown(r, c), l: h && joinsLeft(r, c), r: h && joinsRight(r, c) }
            const sides = [j.u, j.d, j.l, j.r].filter(Boolean).length
            if (sides >= 2) return glyph(j) ?? ch
            // The end of a bare line, `+---+`, is still line; a `+` that
            // joins nothing, or only one vertical side, is text: `a + b`.

            return h && (j.l || j.r) ? '─' : ch
          }
          // A backtick before a line is a tree's last corner: `` `-- ``.
          if (ch === '`' && joinsRight(r, c)) return '└'

          return ch
        })
        .join(''),
    )
    .join('\n')
}
