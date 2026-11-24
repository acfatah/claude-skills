// Splits a reply into the parts the mod draws (tables, bullet lists, headings,
// rules), the code fences, and the markdown between them, which the engine
// draws. No engine imports, so a benchmark or a test can run it alone.

import { splitRow } from './table'
import type { Table } from './table'

// One bullet item: its text, dedented, which may hold nested lists, tables
// or code; `blankBefore` marks a loose item, with a blank line above it.
export type Item = { body: string; blankBefore: boolean }

// `blankBefore`: a blank line separates the part from the one before it.
export type Segment =
  | { kind: 'markdown'; text: string; blankBefore: boolean }
  // A fenced code block, fences included; the engine draws it, full width.
  | { kind: 'code'; text: string; blankBefore: boolean }
  | { kind: 'table'; table: Table; blankBefore: boolean }
  | { kind: 'list'; items: Item[]; blankBefore: boolean }
  | { kind: 'heading'; level: number; text: string; blankBefore: boolean }
  | { kind: 'rule'; text: string; blankBefore: boolean }

// `width`: a quote is a reason to draw a reply, so its prose gets the cap;
// the engine draws the quote itself.
export type Parts = { tables: boolean; bullets: boolean; headings: boolean; rules: boolean; width?: boolean }

// A table's delimiter row: one dash or more per cell, as GFM allows, so
// `| :- | :- |` counts as well as `| --- | --- |`.
const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
const FENCE = /^\s*(```|~~~)/
const BULLET = /^( *)([-*+])( +)(.*)$/
const ORDERED = /^( *)(\d{1,9}[.)])( +)/
const RULE = /^ {0,3}([-*_])( *\1){2,} *$/
// An ATX heading: `#` to `######`, a space, the text, optional closing `#`s.
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/
// A line of `-` alone: under paragraph text it makes a setext heading.
const SETEXT = /^ {0,3}-+ *$/
// Lines that start a block of their own, so they never continue an item.
const BLOCK = /^ {0,3}(#{1,6}(\s|$)|>|```|~~~|\|)/

// A blockquote line, as CommonMark starts one.
const QUOTE = /^ {0,3}>/m

const isBlank = (line: string) => line.trim() === ''
const isRow = (line: string) => line.trim().startsWith('|')
const indentOf = (line: string) => line.length - line.trimStart().length

// A bullet line: where its marker sits, where its text starts, and the text.
// More than four spaces after the marker count as one, as in CommonMark.
const bullet = (line: string) => {
  if (RULE.test(line)) return undefined
  const m = BULLET.exec(line)
  if (!m) return undefined
  const indent = (m[1] ?? '').length
  const gap = (m[3] ?? '').length
  const content = indent + 1 + (gap > 4 ? 1 : gap)

  return { indent, content, text: line.slice(content) }
}

// Reads the list whose first item is at `start`; `end` is the first line
// after it.
const readList = (lines: string[], start: number): { items: Item[]; end: number } => {
  const items: Item[] = []
  let i = start
  let blankBefore = false
  for (;;) {
    const b = bullet(lines[i] ?? '')
    if (!b) break
    const body = [b.text]
    let inFence = FENCE.test(b.text)
    let j = i + 1
    while (j < lines.length) {
      const line = lines[j] ?? ''
      if (isBlank(line)) {
        // A blank line stays in the item only if indented text follows.
        let k = j
        while (k < lines.length && isBlank(lines[k] ?? '')) k++
        if (k < lines.length && indentOf(lines[k] ?? '') >= b.content) {
          for (; j < k; j++) body.push('')
          continue
        }
        break
      }
      if (inFence || indentOf(line) >= b.content) {
        const text = line.slice(Math.min(b.content, indentOf(line)))
        if (FENCE.test(text)) inFence = !inFence
        body.push(text)
        j++
        continue
      }
      // A lazy line: unindented text that carries on the item's paragraph.
      const lazy = !isBlank(body[body.length - 1] ?? '') && !bullet(line) && !ORDERED.test(line)
      if (lazy && !BLOCK.test(line) && !RULE.test(line)) {
        body.push(line.trim())
        j++
        continue
      }
      break
    }
    items.push({ body: body.join('\n'), blankBefore })

    // Blank lines, then another bullet: the same list, loose.
    let k = j
    while (k < lines.length && isBlank(lines[k] ?? '')) k++
    const next = bullet(lines[k] ?? '')
    if (k < lines.length && next && next.indent <= 3) {
      blankBefore = k > j
      i = k
    } else {
      i = j
      break
    }
  }

  return { items, end: i }
}

export const segment = (text: string, parts: Parts): Segment[] => {
  const lines = text.split('\n')
  const out: Segment[] = []
  let buf: string[] = []
  let bufGap: boolean | undefined
  let gap = false
  let inFence = false
  // The text column of the ordered item still open, or -1: bullets nested in
  // an ordered list stay with it, for the engine to draw.
  let ordered = -1
  const flush = () => {
    const md = buf.join('\n').replace(/^\n+|\n+$/g, '')
    if (md.trim()) out.push({ kind: 'markdown', text: md, blankBefore: bufGap ?? false })
    buf = []
    bufGap = undefined
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (isBlank(line)) {
      buf.push(line)
      gap = true
      continue
    }
    // A fence closes an ordered item it is not indented under.
    if (!inFence && ordered >= 0 && FENCE.test(line) && indentOf(line) < ordered) ordered = -1
    // A fence outside an ordered item, with its body, is a part of its own.
    if (!inFence && ordered < 0 && FENCE.test(line) && indentOf(line) <= 3) {
      flush()
      const code = [line]
      let j = i + 1
      while (j < lines.length) {
        const l = lines[j] ?? ''
        code.push(l)
        j++
        if (FENCE.test(l)) break
      }
      // An unclosed fence runs to the end; its trailing blank lines go.
      while (code.length > 1 && isBlank(code[code.length - 1] ?? '')) code.pop()
      out.push({ kind: 'code', text: code.join('\n'), blankBefore: gap })
      gap = false
      i = j - 1
      continue
    }
    const wasFence = inFence
    if (FENCE.test(line)) inFence = !inFence
    if (!wasFence && !inFence) {
      const o = ORDERED.exec(line)
      if (o && (o[1] ?? '').length <= 3) {
        ordered = (o[1] ?? '').length + (o[2] ?? '').length + Math.min((o[3] ?? '').length, 4)
      } else if (ordered >= 0 && indentOf(line) < ordered) {
        ordered = -1
      }
      // Headings and rules inside an open ordered item stay with it.
      const h = ordered < 0 ? HEADING.exec(line) : null
      if (parts.headings && h) {
        flush()
        out.push({ kind: 'heading', level: (h[1] ?? '#').length, text: (h[2] ?? '').trim(), blankBefore: gap })
        gap = false
        continue
      }
      const underPara = buf.length > 0 && !isBlank(buf[buf.length - 1] ?? '')
      if (ordered < 0 && RULE.test(line) && !(underPara && SETEXT.test(line))) {
        if (parts.rules) {
          flush()
          out.push({ kind: 'rule', text: line.trim(), blankBefore: gap })
          gap = false
          continue
        }
        // A rule is never a bullet, even with the rules feature off.
        if (bufGap === undefined) bufGap = gap
        gap = false
        buf.push(line)
        continue
      }
      const b = ordered < 0 ? bullet(line) : undefined
      if (parts.bullets && b && b.indent <= 3) {
        flush()
        const { items, end } = readList(lines, i)
        out.push({ kind: 'list', items, blankBefore: gap })
        gap = false
        i = end - 1
        continue
      }
      const next = lines[i + 1]
      // GFM needs as many delimiter cells as header cells; a delimiter row
      // with no pipe, such as a lone `-`, is left to the engine.
      const isTable =
        isRow(line) &&
        next !== undefined &&
        next.includes('|') &&
        SEPARATOR.test(next) &&
        splitRow(next).length === splitRow(line).length
      if (parts.tables && isTable) {
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
        out.push({ kind: 'table', table: { header, rows }, blankBefore: gap })
        gap = false
        continue
      }
    }
    if (bufGap === undefined) bufGap = gap
    gap = false
    buf.push(line)
  }
  flush()

  return out
}

// Whether a reply may hold a part to draw: a cheap test before `segment`.
export const mayHold = (text: string, parts: Parts) =>
  (parts.tables && text.includes('|')) ||
  (parts.bullets && /^ {0,3}[-*+] /m.test(text)) ||
  (parts.headings && /^ {0,3}#{1,6}([ \t]|$)/m.test(text)) ||
  (parts.rules && /^ {0,3}([-*_])( *\1){2,} *$/m.test(text)) ||
  (parts.width === true && QUOTE.test(text))

// Whether the parts are worth drawing: a part the mod draws, or, with
// `width` on, a quote in the markdown, so its lines wrap at the cap.
export const worthDrawing = (all: Segment[], parts: Parts) =>
  all.some(p => p.kind !== 'markdown' && p.kind !== 'code') ||
  (parts.width === true && all.some(p => p.kind === 'markdown' && QUOTE.test(p.text)))
