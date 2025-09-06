import * as Tone from 'tone'
import type { MusicSpec } from './generator'

// Map simple synth names to Tone.js instruments / players
async function sampleExists(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch (_) {
    return false
  }
}

async function createInstrument(name: string, reverb: Tone.Reverb) {
  const id = name.toLowerCase()
  console.debug('[player] createInstrument req=', name)
  const useSmplr = async (instr: string) => {
    try {
      const SMmod: any = await import('smplr')
      const SM = SMmod && (SMmod.default ?? SMmod)
      const audioCtx = (Tone.context && ((Tone.context as any).rawContext ?? (Tone.context as any).context)) || (Tone.context as any)
      // try common APIs
      if (SM && typeof SM.instrument === 'function') {
        try {
          const inst = await SM.instrument(instr, { context: Tone.context })
          if (inst && (typeof inst.triggerAttackRelease === 'function' || typeof inst.play === 'function')) return inst
        } catch (_) {}
      }
      // try constructor classes exported by smplr (e.g. SplendidGrandPiano, Sampler, etc.)
      if (SM) {
        const Cre = SM[instr] || SM[instr.replace(/[-_ ]+(.)/g, (_, c) => c.toUpperCase())]
        if (typeof Cre === 'function') {
          try {
            const inst = new Cre((audioCtx as any))
            // wait for samples to load if available
            if (inst && inst.load) {
              try { await inst.load } catch (_) {}
            }
            return inst
          } catch (_) {}
        }
      }
      if (SM && typeof SM.get === 'function') {
        try {
          const inst = await SM.get(instr)
          if (inst) return inst
        } catch (_) {}
      }
      return null
    } catch (e) {
      return null
    }
  }
  const useSampler = async (instName: string) => {
    const base = `/samples/${instName}/`
    const testUrl = base + 'A4.mp3'
    if (await sampleExists(testUrl)) {
      const sam = new Tone.Sampler({ urls: { A4: 'A4.mp3' }, baseUrl: base }).connect(reverb)
      await sam.loaded
      return sam
    }
    return null
  }

  // try samplers for realistic instruments first
  if (id.includes('guitar')) {
    // prefer soundfont if available
    const sf = await useSmplr('acoustic_guitar_nylon')
    if (sf) return sf
    const s = await useSampler('guitar')
    if (s) return s
    const dataUri = await generatePluckDataURI(440, 0.9, 22050)
    const sam = new Tone.Sampler({ urls: { A4: dataUri } }).connect(reverb)
    return sam
  }

  if (id.includes('violin')) {
  const sf = await useSmplr('violin')
  if (sf) return sf
  const s = await useSampler('violin')
  if (s) return s
  return new Tone.FMSynth({ harmonicity: 2, modulationIndex: 8 }).connect(reverb)
  }

  if (id.includes('tabla')) {
    const s = await useSampler('tabla')
    if (s) return s
    return new Tone.MembraneSynth().connect(reverb)
  }

  // simple synth mappings
  if (id.includes('saw')) return new Tone.Synth({ oscillator: { type: 'sawtooth' } }).connect(reverb)
  if (id.includes('sine')) return new Tone.Synth({ oscillator: { type: 'sine' } }).connect(reverb)

  // default
  return new Tone.Synth().connect(reverb)
}

async function generatePluckDataURI(freq = 440, duration = 0.9, sampleRate = 22050) {
  // Create offline context
  const length = Math.ceil(duration * sampleRate)
  const offline = new (window as any).OfflineAudioContext(1, length, sampleRate)

  // simple pluck: filtered noise burst into bandpass and high-Q filter to simulate string
  const noise = offline.createBufferSource()
  const buffer = offline.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length)
  noise.buffer = buffer

  const band = offline.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = freq
  band.Q.value = 8

  const low = offline.createBiquadFilter()
  low.type = 'lowpass'
  low.frequency.value = 8000

  noise.connect(band)
  band.connect(low)
  low.connect(offline.destination)
  noise.start(0)

  const rendered = await offline.startRendering()

  // encode WAV
  const wav = audioBufferToWav(rendered)
  const blob = new Blob([new DataView(wav)], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

// small WAV encoder (from audio-buffer-to-wav style)
function audioBufferToWav(abuffer: AudioBuffer) {
  const numChannels = abuffer.numberOfChannels
  const sampleRate = abuffer.sampleRate
  const format = 1
  const samples = abuffer.length
  const buffer = new ArrayBuffer(44 + samples * numChannels * 2)
  const view = new DataView(buffer)

  /* RIFF identifier */ writeString(view, 0, 'RIFF')
  /* file length */ view.setUint32(4, 36 + samples * numChannels * 2, true)
  /* RIFF type */ writeString(view, 8, 'WAVE')
  /* format chunk identifier */ writeString(view, 12, 'fmt ') 
  /* format chunk length */ view.setUint32(16, 16, true)
  /* sample format (raw) */ view.setUint16(20, format, true)
  /* channel count */ view.setUint16(22, numChannels, true)
  /* sample rate */ view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */ view.setUint32(28, sampleRate * numChannels * 2, true)
  /* block align (channel count * bytes per sample) */ view.setUint16(32, numChannels * 2, true)
  /* bits per sample */ view.setUint16(34, 16, true)
  /* data chunk identifier */ writeString(view, 36, 'data')
  /* data chunk length */ view.setUint32(40, samples * numChannels * 2, true)

  // write interleaved PCM samples
  let offset = 44
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, abuffer.getChannelData(ch)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }
  return buffer
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

export class Player {
  private instruments: Map<string, any> = new Map()
  private loop = false
  private currentSpec: MusicSpec | null = null
  private playPromise: Promise<void> | null = null
  private resolvePlay: (() => void) | null = null
  // cached effects so preload can use same chain
  private _reverb: Tone.Reverb | null = null
  private _delay: Tone.FeedbackDelay | null = null
  private _comp: Tone.Compressor | null = null

  constructor() {
    try { (window as any).__LEAF_PLAYER = this } catch (_) {}
  }

  async start(spec: MusicSpec, opts?: { loop?: boolean }) {
    if (this.playPromise) return this.playPromise
    this.currentSpec = spec
    this.loop = !!opts?.loop

    // ensure Tone is started (needs user gesture)
    try { await Tone.start() } catch (_) {}

    // ensure effects exist and reuse them
    const reverb = await this.ensureEffects()

    for (const t of spec.tracks) {
      if (!this.instruments.has(t.synth)) {
        const inst = await createInstrument(t.synth, reverb)
        // if this is a smplr-style instrument with an output node, connect it to our effects
        try {
          if (inst && (inst as any).output) {
            const out = (inst as any).output
            const outNode = out.input ?? out
            const reverbInput = (reverb as any).input ?? (reverb as any)
            if (outNode && typeof outNode.connect === 'function' && reverbInput) {
              try { outNode.connect(reverbInput) } catch (_) {}
            }
          }
        } catch (_) {}
        this.instruments.set(t.synth, inst)
      }
    }

    this.playPromise = new Promise(async (resolve) => {
      this.resolvePlay = resolve
      await this._playOnce()
    })

    return this.playPromise
  }

  // Ensure effects chain exists and return the top reverb node
  private async ensureEffects() {
    if (this._reverb && this._delay && this._comp) return this._reverb
    this._reverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 })
    this._delay = new Tone.FeedbackDelay({ delayTime: 0.18, feedback: 0.12, wet: 0.06 })
    this._comp = new Tone.Compressor({ threshold: -24, ratio: 3, attack: 0.03, release: 0.3 })
    this._reverb.connect(this._delay)
    this._delay.connect(this._comp)
    this._comp.toDestination()
    await this._reverb.generate()
    return this._reverb
  }

  // Preload a single instrument and return a small report string about which backend was used
  async preloadInstrument(name: string) {
    const reverb = await this.ensureEffects()
    // if already loaded, report
    if (this.instruments.has(name)) return `cached:${name}`
    const inst = await createInstrument(name, reverb)
    this.instruments.set(name, inst)
    // best-effort inspect inst to report backend
    if ((inst as any).name) return `smplr:${(inst as any).name}`
    if ((inst as any).triggerAttackRelease && !(inst instanceof Tone.Synth)) return `sampler-or-smplr:${name}`
    if (inst instanceof Tone.Synth || inst instanceof Tone.FMSynth || inst instanceof Tone.PluckSynth || inst instanceof Tone.MembraneSynth) return `synth:${name}`
    return `unknown:${name}`
  }

  private async _playOnce() {
    if (!this.currentSpec) return
    const spec = this.currentSpec
    const bpm = spec.tempo || 120
    const beatSec = 60 / bpm

    // Use Tone.Transport for scheduling
    Tone.Transport.cancel()
    Tone.Transport.bpm.value = bpm
    Tone.Transport.position = '0:0:0'

    let lastMeasure = 0

    spec.tracks.forEach((track) => {
      const instr = this.instruments.get(track.synth)
      let beatPos = 0
      track.notes.forEach((n) => {
        const durBeats = n.durationBeats
        const timeSeconds = beatPos * beatSec
        // schedule using Transport.schedule once per note
        Tone.Transport.schedule((time: any) => {
          try {
            // If smplr-style instrument, call .start({ note, velocity, time })
            if (typeof instr.start === 'function') {
              try {
                const sample: any = { note: n.pitch, time }
                if ((n as any).velocity) sample.velocity = (n as any).velocity
                // duration may be honored by the instrument via `duration` or `decayTime`
                sample.duration = durBeats * beatSec
                instr.start(sample)
                return
              } catch (inner) {}
            }
            // If sampler/synth, triggerAttackRelease expects note + duration
            if (typeof instr.triggerAttackRelease === 'function') {
              instr.triggerAttackRelease(n.pitch, `${durBeats * beatSec}s`, time)
            } else if (typeof instr.triggerAttack === 'function') {
              instr.triggerAttack(n.pitch, time)
            }
          } catch (e) {
            // fallback: try playing with the provided scheduled time so nested events
            // are aligned to the Transport (avoids Tone.js accurate-timing warning)
            try { instr.triggerAttackRelease && instr.triggerAttackRelease(n.pitch, `${durBeats * beatSec}s`, time) } catch (_) {}
            try { if (typeof instr.start === 'function') instr.start({ note: n.pitch, time, duration: durBeats * beatSec }) } catch (_) {}
          }
        }, timeSeconds)

        beatPos += durBeats
      })
      lastMeasure = Math.max(lastMeasure, beatPos)
    })

    // start transport
    Tone.Transport.start()

    // schedule finish or loop
    const totalMs = Math.max(0, lastMeasure * (60 / (spec.tempo || 120)) * 1000)
    setTimeout(async () => {
      if (this.loop) {
        Tone.Transport.stop()
        await this._playOnce()
        return
      }
      Tone.Transport.stop()
      if (this.resolvePlay) {
        this.resolvePlay()
        this.resolvePlay = null
        this.playPromise = null
      }
    }, totalMs + 50)
  }

  stop() {
    this.loop = false
    this.currentSpec = null
    try { Tone.Transport.stop(); Tone.Transport.cancel() } catch (_) {}
    try { this.instruments.forEach((ins) => { if (ins.dispose) ins.dispose() }) } catch (_) {}
    this.instruments.clear()
    if (this.resolvePlay) {
      try { this.resolvePlay() } catch (_) {}
      this.resolvePlay = null
      this.playPromise = null
    }
  try { delete (window as any).__LEAF_PLAYER } catch (_) {}
  }

  // debug helper: play a single immediate note (useful from console)
  async testNote(note: string, duration = 0.6) {
    try { await Tone.start() } catch (_) {}
    const inst = this.instruments.get('guitar') || new Tone.PluckSynth().toDestination()
    // smplr-style: .start({note, velocity?, time?}) or .play(note, dur)
    try {
      if (typeof (inst as any).start === 'function') {
        (inst as any).start({ note, duration })
        return
      }
      if (typeof (inst as any).play === 'function') {
        (inst as any).play(note, duration)
        return
      }
      if (typeof inst.triggerAttackRelease === 'function') {
        (inst as any).triggerAttackRelease(note, `${duration}s`)
        return
      }
    } catch (_) {}
  }
}

export default Player
