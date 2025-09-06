import { describe, it, expect } from 'vitest'
import { parseToAST, parse } from '../compiler/parser'
import { parseMusic, noteToFrequency } from '../audio/generator'

const sample = `
tempo = 100
track "Lead" using synth("basic", { adsr: [0.01, 0.1, 0.8, 0.2] }) {
  notes [ C4, D4, E4, F4 ]
  rhythm [ 1/4, 1/4, 1/4, 1/4 ]
}
`

describe('parser and AST integration', () => {
  it('parses source with Ohm (parse)', () => {
    const res = parse(sample)
    expect(res.ok).toBe(true)
    if (res.ok) {
      // CST should be an Ohm match
      expect(typeof res.cst.succeeded).toBe('function')
    }
  })

  it('parseToAST returns a MusicSpec-like object', () => {
    const astRes = parseToAST(sample)
    expect(astRes.ok).toBe(true)
    if (astRes.ok) {
      const ast = astRes.ast
      expect(ast).toHaveProperty('tempo')
      expect(ast).toHaveProperty('tracks')
      expect(Array.isArray(ast.tracks)).toBe(true)
      expect(ast.tracks.length).toBeGreaterThan(0)
      const t = ast.tracks[0]
      expect(t).toHaveProperty('name')
      expect(t).toHaveProperty('synth')
      expect(Array.isArray(t.notes)).toBe(true)
      expect(t.notes.length).toBeGreaterThan(0)
    }
  })

  it('parseMusic produces expected numeric conversions', () => {
    const music = parseMusic(sample)
    expect(music.tempo).toBe(100)
    expect(music.tracks.length).toBeGreaterThan(0)
    const n = music.tracks[0].notes[0]
    expect(n.durationBeats).toBeGreaterThan(0)
    // noteToFrequency should return a number for a valid note
    expect(typeof noteToFrequency(n.pitch)).toBe('number')
  })
})
