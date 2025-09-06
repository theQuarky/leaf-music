import React, { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import './App.css'
import { parse, parseToAST } from './compiler/parser';
import * as Tone from 'tone'

declare global {
  interface Window {
    __LEAF_PLAYER?: any
  }
}
import Player from './audio/player'
import { requestMIDIPermission, prettyMIDIPorts } from './audio/midi'
// import raw grammar
// @ts-ignore - Vite raw import
import grammarRaw from './compiler/leafmusic.ohm?raw'
import { generateMonarchKeywordsFromOhm } from './compiler/monarchGenerator'

const samples: Record<string, string> = {
  "Simple Melody": `tempo = 120
scale = "C minor"

track "lead" using synth("saw", { adsr:[0.01,0.1,0.2,0.2] }) {
  notes  [C4, D#4, G4, A#4]
  rhythm [1/8, 1/8, 1/4, 1/2]
  fx     reverb(0.25)
}

scene "drop" 16 bars { gain 1 }
`,
  "Ambient Pad": `// Ambient pad pseudo-code\noscillator1.freq = 220\noscillator2.freq = 330\n// ...`,
}

function App() {
  const [code, setCode] = useState(samples['Simple Melody'])
  const [example, setExample] = useState('Simple Melody')
  const playerRef = useRef<Player | null>(null)
  const [playing, setPlaying] = useState(false)
  // Visualizer removed for now. Editor occupies the workspace.
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(canvas.clientWidth * dpr)
      canvas.height = Math.floor(canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(now: number) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      const energy = Math.min(1, code.length / 400)
      const bars = 28
      const barW = w / bars
      for (let i = 0; i < bars; i++) {
        const t = now / 1000 + i
        const amp = (Math.sin(t * (0.5 + i / 20)) + 1) / 2
        const height = (amp * 0.7 + energy * 0.6) * h
        const x = i * barW
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, '#9be7c4')
        grad.addColorStop(1, '#4bbf73')
        ctx.fillStyle = grad
        ctx.fillRect(x + 2, h - height, barW - 4, height)
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [code])

  // Monaco editor + monaco namespace refs for markers
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)

  function applyParseMarkers(src: string) {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    console.debug('[leaf-debug] applyParseMarkers: modelLanguage=', editor.getModel()?.getLanguageId())
    try {
      const res = parse(src)
      if (!res.ok) {
        const msg = typeof res.errors === 'string' ? res.errors : String(res.errors)
        const markers = [
          {
            severity: monaco.MarkerSeverity.Error,
            message: msg,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 2,
          },
        ]
        console.debug('[leaf-debug] setModelMarkers', markers)
        monaco.editor.setModelMarkers(editor.getModel(), 'leafmusic', markers)
      } else {
        console.debug('[leaf-debug] clear markers')
        monaco.editor.setModelMarkers(editor.getModel(), 'leafmusic', [])
      }
    } catch (err) {
      console.error('[leaf-debug] applyParseMarkers error', err)
      // fallback: clear markers on unexpected errors
      monaco.editor.setModelMarkers(editor.getModel(), 'leafmusic', [])
    }
  }

  function handleExampleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const k = e.target.value
    setExample(k)
    setCode(samples[k] ?? '')
  }

  function exportFile(ext: 'mp3' | 'mp4') {
    // Placeholder export: create a small blob so users can wire up real export later
    const content = `// Exported from Leaf Music\n// type: ${ext}\n// code length: ${code.length}`
    const blob = new Blob([content], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leaf-music-export.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="logo-wrap">
          <svg className="app-logo" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="30" fill="#e9fff0" />
            <path d="M20 36c6-12 20-12 24-8-6 6-8 18-20 18-6 0-6-6-4-10z" fill="#66c17a" />
          </svg>
          <div className="title">Leaf Music</div>
        </div>

        <div className="menu">
          <label className="menu-item">
            Examples
            <select value={example} onChange={handleExampleChange}>
              {Object.keys(samples).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={() => exportFile('mp3')}>Export MP3</button>
          <button className="btn" onClick={() => exportFile('mp4')}>Export MP4</button>
          <button className="btn" onClick={async () => {
            // Request Web MIDI access
            try {
              const res = await requestMIDIPermission()
              if (res.ok) {
                const pretty = prettyMIDIPorts(res.access)
                console.debug('[midi] access granted', pretty)
                alert(`MIDI access granted. Inputs: ${pretty.inputs.join(', ') || 'none'}; Outputs: ${pretty.outputs.join(', ') || 'none'}`)
              } else {
                console.warn('[midi] access denied or unavailable', res.error)
                alert('MIDI access failed: ' + String(res.error))
              }
            } catch (e) {
              console.error('[midi] request failed', e)
              alert('MIDI request failed: ' + String(e))
            }
          }}>Request MIDI</button>
            <button className="btn" onClick={async () => {
              // Test smplr / guitar path with a short riff
              if (playing) {
              playerRef.current?.stop()
              setPlaying(false)
              return
            }

            const spec = {
              tempo: 90,
              tracks: [
                {
                  name: 'GuitarTest',
                  synth: 'guitar',
                  notes: [
                    { pitch: 'E4', durationBeats: 0.125 },
                    { pitch: 'G4', durationBeats: 0.125 },
                    { pitch: 'A4', durationBeats: 0.25 },
                    { pitch: 'E4', durationBeats: 0.125 },
                    { pitch: 'D4', durationBeats: 0.125 },
                    { pitch: 'E4', durationBeats: 0.5 },
                  ],
                },
              ],
            }

            playerRef.current = new Player()
            setPlaying(true)
            try {
              // preload the guitar instrument and log the backend used
              try { await Tone.start() } catch (_) {}
              const report = await playerRef.current.preloadInstrument('guitar')
              console.debug('[Test Guitar] preload report=', report)
              await playerRef.current.start(spec)
            } catch (err) {
              console.error('Test Guitar playback failed', err)
            }
            setPlaying(false)
          }}>Test Guitar</button>
          <button className="btn" onClick={async () => {
            // Force a direct Tone.js smoke test (bypass Player)
            try {
              console.debug('[tone-test] before Tone.start, ctx=', Tone.context?.state)
              await Tone.start()
              console.debug('[tone-test] after Tone.start, ctx=', Tone.context?.state)
              const s = new Tone.Synth().toDestination()
              s.triggerAttackRelease('A4', '0.6')
              // also try player testNote if present
              try { window.__LEAF_PLAYER?.testNote && window.__LEAF_PLAYER.testNote('A4', 0.6) } catch (_) {}
            } catch (e) {
              console.error('[tone-test] failed', e)
            }
          }}>Force Tone Test</button>
          <button className="btn" onClick={async () => {
            if (playing) {
              playerRef.current?.stop()
              setPlaying(false)
              return
            }

            const astRes = parseToAST(code)
            if (!astRes.ok) {
              alert('Parse error: ' + String((astRes as any).errors))
              return
            }

            const spec = astRes.ast
            playerRef.current = new Player()
            // mark as playing immediately so UI updates; start() resolves when playback ends
            setPlaying(true)
            try {
              await playerRef.current.start(spec)
              // playback completed normally
              setPlaying(false)
            } catch (err) {
              console.error('Playback failed', err)
              setPlaying(false)
            }
          }}>{playing ? 'Stop' : 'Play'}</button>
        </div>
      </header>

      <main className="workspace">
        <section className="editor">
          <div className="pane-title">Code Editor</div>
          <div className="editor-wrap">
            <Editor
              height="100%"
              language="leafmusic"
              defaultLanguage="leafmusic"
              value={code}
              theme="leafLight"
              onMount={(editor, monaco) => {
                editorRef.current = editor
                monacoRef.current = monaco
                console.debug('[leaf-debug] onMount: editor mounted')
                try {
                  const model = editor.getModel()
                  console.debug('[leaf-debug] onMount: before setModelLanguage, modelLanguage=', model?.getLanguageId())
                  if (model) monaco.editor.setModelLanguage(model, 'leafmusic')
                  console.debug('[leaf-debug] onMount: after setModelLanguage, modelLanguage=', model?.getLanguageId())
                  try {
                    const langs = monaco.languages.getLanguages().map((l: any) => l.id)
                    console.debug('[leaf-debug] registered languages:', langs)
                  } catch (e) {
                    console.debug('[leaf-debug] getLanguages failed', e)
                  }
                } catch (e) {
                  console.error('[leaf-debug] setModelLanguage failed', e)
                }
                editor.layout()
                applyParseMarkers(code)
              }}
              onChange={(val: string | undefined) => {
                const v = val ?? ''
                setCode(v)
                applyParseMarkers(v)
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'Roboto Mono, Menlo, monospace',
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
              }}
              beforeMount={(monaco: any) => {
                console.debug('[leaf-debug] beforeMount: registering language and tokenizer')
                // Theme
                monaco.editor.defineTheme('leafLight', {
                  base: 'vs',
                  inherit: true,
                  rules: [],
                  colors: {
                    'editor.background': '#fbfff9',
                    'editorLineNumber.foreground': '#9aa69a',
                    'editorCursor.foreground': '#2b8f5a',
                    'editor.selectionBackground': '#cfeedb',
                  },
                })

                // Register language
                monaco.languages.register({ id: 'leafmusic' })

                // Generate keywords from Ohm grammar for better parity
                const genKeywords = generateMonarchKeywordsFromOhm(grammarRaw)
                console.debug('[leaf-debug] generated keywords count=', genKeywords.length, 'sample=', genKeywords.slice(0, 20))

                // Monarch tokenizer
                monaco.languages.setMonarchTokensProvider('leafmusic', {
                  defaultToken: '',
                  tokenPostfix: '.leaf',
                  keywords: genKeywords,
                  types: ['Number', 'String', 'Bool'],
                  operators: ['=', ':', ',', '\\.', '\\*', '/', '\\+', '-'],
                  symbols: /[=><!~?:&|+\-*\/^%]+/,
                  escapes: /\\(?:[nrt"'\\]|u[0-9A-Fa-f]{4})/,
                  tokenizer: {
                    root: [
                      [/\/\/.*$/, 'comment'],
                      [/\b(true|false)\b/, 'keyword'],
                      [/[A-G](?:#|b)?\d+/, 'number'], // notes like C4
                      [/\b[IVXLCM]+\b/, 'keyword'], // roman numerals
                      [/\b\d+\/\d+\b/, 'number'], // duration
                      [/\d+\.\d+|\d+/, 'number'],
                      [/'[^']*'/, 'string'],
                      [/"[^"]*"/, 'string'],
                      [/[{}()[\]]/, '@brackets'],
                      [/\[|\]/, '@brackets'],
                      [/[;,\.]/, 'delimiter'],
                      [/[a-zA-Z_][\w_]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
                    ],
                  },
                })

                // Language configuration
                monaco.languages.setLanguageConfiguration('leafmusic', {
                  comments: { lineComment: '//' },
                  brackets: [['{', '}'], ['[', ']'], ['(', ')']],
                  autoClosingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" }
                  ],
                })
              }}
            />
          </div>
        </section>

        <section className="visualizer">
          <div className="pane-title">Music Visualizer</div>
          <div className="viz-box">
            <canvas className="viz-canvas" ref={canvasRef} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
