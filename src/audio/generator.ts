export interface NoteEvent {
  pitch: string // e.g. C4, D#4
  durationBeats: number
}

export interface TrackSpec {
  name: string
  synth: string
  adsr?: number[]
  notes: NoteEvent[]
}

export interface MusicSpec {
  tempo: number
  tracks: TrackSpec[]
}

function fracToBeats(frac: string) {
  const parts = frac.trim().split('/')
  if (parts.length === 2) {
    const a = parseFloat(parts[0])
    const b = parseFloat(parts[1])
    if (!isNaN(a) && !isNaN(b) && b !== 0) return a / b
  }
  const n = parseFloat(frac)
  return isNaN(n) ? 0 : n
}

export function parseMusic(source: string): MusicSpec {
  const tempoMatch = source.match(/tempo\s*=\s*(\d+(?:\.\d+)?)/i)
  const tempo = tempoMatch ? parseFloat(tempoMatch[1]) : 120

  const tracks: TrackSpec[] = []

  const trackRe = /track\s+"([^"]+)"\s+using\s+synth\("([^"\\]+)"(?:\s*,\s*\{([^}]*)\})?\)\s*\{([\s\S]*?)\}/gi
  let tm: RegExpExecArray | null
  while ((tm = trackRe.exec(source)) !== null) {
    const name = tm[1]
    const synth = tm[2]
    const objText = tm[3] || ''
    const body = tm[4] || ''

    // parse adsr from objText
    let adsr: number[] | undefined
    const adsrMatch = objText.match(/adsr\s*:\s*\[([^\]]+)\]/i)
    if (adsrMatch) {
      adsr = adsrMatch[1].split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
    }

    // notes
    const notesMatch = body.match(/notes\s*\[([^\]]+)\]/i)
    const rhythmMatch = body.match(/rhythm\s*\[([^\]]+)\]/i)

    const noteTokens = notesMatch ? notesMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []
    const rhythmTokens = rhythmMatch ? rhythmMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []

    const notes: NoteEvent[] = []
    for (let i = 0; i < noteTokens.length; i++) {
      const pitch = noteTokens[i]
      const durToken = rhythmTokens[i % rhythmTokens.length] ?? '1/4'
      const beats = fracToBeats(durToken)
      notes.push({ pitch, durationBeats: beats })
    }

    tracks.push({ name, synth, adsr, notes })
  }

  return { tempo, tracks }
}

// simple helper to convert note name to frequency
export function noteToFrequency(note: string) {
  // note like C4, D#3, Bb5
  const m = note.match(/^([A-Ga-g])(#|b)?(\d+)$/)
  if (!m) return 440
  const letter = m[1].toUpperCase()
  const accidental = m[2]
  const octave = parseInt(m[3], 10)

  const baseMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const base = baseMap[letter]
  let semis = typeof base === 'number' ? base : 0
  if (accidental === '#') semis = semis + 1
  if (accidental === 'b') semis = semis - 1

  const midi = (octave + 1) * 12 + semis
  const freq = 440 * Math.pow(2, (midi - 69) / 12)
  return freq
}
