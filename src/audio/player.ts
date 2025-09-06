import { noteToFrequency } from './generator'
import type { MusicSpec } from './generator'

export class Player {
  private ctx: AudioContext | null = null
  private scheduled: AudioBufferSourceNode[] = []
  private running = false
  private endTimer: number | null = null
  private loop = false
  private currentSpec: MusicSpec | null = null
  private playPromise: Promise<void> | null = null
  private resolvePlay: (() => void) | null = null

  async start(spec: MusicSpec, opts?: { loop?: boolean }) {
    // If already playing, return existing play promise so callers can await stop
    if (this.playPromise) return this.playPromise

    this.currentSpec = spec
    this.loop = !!opts?.loop
    this.running = true
    this.playPromise = new Promise(async (resolve) => {
      this.resolvePlay = resolve
      // (re)create AudioContext if needed
      if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      try {
        if (this.ctx.state === 'suspended') await this.ctx.resume()
      } catch (_) {}

      // schedule first iteration
      this._scheduleOnce()
    })

    return this.playPromise
  }

  // schedule one playback iteration and set timeout to either loop or finish
  private _scheduleOnce() {
    if (!this.ctx || !this.currentSpec) return
    const spec = this.currentSpec
    const bpm = spec.tempo || 120
    const beatSec = 60 / bpm
    const now = this.ctx.currentTime + 0.05

    let lastStopTime = now
    for (const track of spec.tracks) {
      let t = now
      for (const ev of track.notes) {
        const freq = noteToFrequency(ev.pitch)
        const dur = Math.max(0.01, ev.durationBeats * beatSec)
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = track.synth === 'saw' ? 'sawtooth' : 'sine'
        osc.frequency.value = freq

        const ctxNow = this.ctx.currentTime
        const clampTime = (x: number) => Math.max(x, ctxNow + 0.001)
        const safeVal = (v: number) => (v <= 0 ? 0.0001 : v)
        const startTime = clampTime(t)

        try { gain.gain.setValueAtTime(0.0001, startTime) } catch (_) { try { gain.gain.setValueAtTime(0.0001, this.ctx!.currentTime) } catch (_) {} }

        const attack = (track.adsr && track.adsr[0]) || 0.01
        const decay = (track.adsr && track.adsr[1]) || 0.05
        const sustain = (track.adsr && track.adsr[2]) || 0.6
        const release = (track.adsr && track.adsr[3]) || 0.05

        const tAttack = clampTime(startTime + Math.max(0.001, attack))
        const tDecay = clampTime(startTime + attack + decay)
        const tSustainSet = clampTime(startTime + dur - release)
        const tRelease = clampTime(startTime + dur + release)

        try { gain.gain.exponentialRampToValueAtTime(safeVal(1.0), tAttack) } catch (_) { try { gain.gain.setValueAtTime(safeVal(1.0), this.ctx!.currentTime) } catch (_) {} }
        try { gain.gain.exponentialRampToValueAtTime(safeVal(sustain), tDecay) } catch (_) { try { gain.gain.setValueAtTime(safeVal(sustain), this.ctx!.currentTime) } catch (_) {} }
        try { gain.gain.setValueAtTime(safeVal(sustain), tSustainSet) } catch (_) { try { gain.gain.setValueAtTime(safeVal(sustain), this.ctx!.currentTime) } catch (_) {} }
        try { gain.gain.exponentialRampToValueAtTime(0.0001, tRelease) } catch (_) { try { gain.gain.setValueAtTime(0.0001, this.ctx!.currentTime) } catch (_) {} }

        osc.connect(gain)
        gain.connect(this.ctx.destination)
        try { osc.start(startTime) } catch (_) { try { osc.start() } catch (_) {} }
        const stopTime = startTime + dur + release + 0.02
        try { osc.stop(stopTime) } catch (_) { try { osc.stop() } catch (_) {} }

        this.scheduled.push(osc as any)
        t += dur
        lastStopTime = Math.max(lastStopTime, stopTime)
      }
    }

    // schedule loop or finish
    const ms = Math.max(0, (lastStopTime - (this.ctx?.currentTime ?? 0)) * 1000 + 20)
    if (this.endTimer) {
      clearTimeout(this.endTimer)
      this.endTimer = null
    }
    this.endTimer = window.setTimeout(() => {
      this.endTimer = null
      if (this.loop && this.running) {
        // start next iteration
        this._scheduleOnce()
        return
      }

      // finish playback
      this.running = false
      const res = this.resolvePlay
      this.resolvePlay = null
      this.playPromise = null
      if (res) res()
    }, ms)
  }

  stop() {
    if (!this.ctx) return
    // clear pending end timer
    if (this.endTimer) {
      clearTimeout(this.endTimer)
      this.endTimer = null
    }

  // stop looped playback
  this.loop = false
  this.currentSpec = null

    try {
      this.scheduled.forEach((n) => {
        try { n.stop() } catch (_) { }
      })
    } catch (_) { }
    this.scheduled = []
    try { this.ctx.close() } catch (_) { }
    this.ctx = null
    this.running = false

    if (this.resolvePlay) {
      try { this.resolvePlay() } catch (_) {}
      this.resolvePlay = null
      this.playPromise = null
    }
  }
}

export default Player
