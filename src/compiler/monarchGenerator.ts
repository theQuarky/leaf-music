/**
 * Extract a conservative set of keyword tokens from an Ohm grammar string
 * for use in Monaco's Monarch tokenizer.
 */
export function generateMonarchKeywordsFromOhm(ohmText: string): string[] {
  const keywords = new Set<string>()

  // --- 1. Quoted literal tokens like "track" or "bar"
  const dqPattern = /"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = dqPattern.exec(ohmText)) !== null) {
    const tok = match[1].trim()
    if (!tok) continue

    // keep tokens that look like words/identifiers
    if (/^[A-Za-z_][A-Za-z0-9_\-]*$/.test(tok)) {
      keywords.add(tok)
    }

    // known unit tokens
    if (/^(ms|s|beat|beats|bar|bars)$/.test(tok)) {
      keywords.add(tok)
    }
  }

  // --- 2. Roman numerals from RomanNumeral rule
  const rnPattern = /RomanNumeral\s*=\s*([^\n]+)/m
  const rnMatch = rnPattern.exec(ohmText)
  if (rnMatch) {
    rnMatch[1]
      .split('|')
      .map(s => s.replace(/"/g, '').trim())
      .filter(Boolean)
      .forEach(rn => keywords.add(rn))
  }

  // --- 3. Always include boolean literals
  keywords.add('true')
  keywords.add('false')

  return Array.from(keywords).sort((a, b) => a.localeCompare(b))
}

export type MonarchKeywords = string[]
