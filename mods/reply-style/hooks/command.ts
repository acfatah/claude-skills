// Parses the `/reply-style` arguments. No engine imports, so a test can run it
// alone.

export const FEATURES = ['tables'] as const
export type Feature = (typeof FEATURES)[number]

export type Command =
  | { kind: 'stats' }
  | { kind: 'reset' }
  | { kind: 'set'; features: readonly Feature[]; on: boolean }
  | { kind: 'usage' }

const isFeature = (s: string): s is Feature => (FEATURES as readonly string[]).includes(s)

export const USAGE = `Usage: /reply-style [${FEATURES.join('|')}] on|off, or /reply-style reset`

// No words: stats. `reset`. `on|off`: every feature. `<feature> on|off`: one.
export const parse = (args: string | undefined): Command => {
  const words = (args ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  const [first, second] = words
  if (first === undefined) return { kind: 'stats' }
  if (first === 'reset' && words.length === 1) return { kind: 'reset' }
  if ((first === 'on' || first === 'off') && words.length === 1) {
    return { kind: 'set', features: FEATURES, on: first === 'on' }
  }
  if (isFeature(first) && (second === 'on' || second === 'off') && words.length === 2) {
    return { kind: 'set', features: [first], on: second === 'on' }
  }

  return { kind: 'usage' }
}
