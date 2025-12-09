# 🍃 Leaf Music

<div align="center">

A browser-based music composition language and synthesizer playground built with modern web technologies.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff.svg)](https://vitejs.dev/)

</div>

## 📖 Overview

Leaf Music is a domain-specific language (DSL) and web-based IDE for music composition and synthesis. It provides an intuitive syntax for defining musical tracks, rhythms, and sound effects, combined with a powerful real-time audio engine powered by Tone.js and smplr.

**Key Highlights:**
- 🎵 Custom music programming language with intuitive syntax
- 🎹 Real-time audio synthesis and playback
- 📝 Monaco-based code editor with syntax highlighting
- 🎨 Live music visualizer
- 🎛️ MIDI support for external controllers
- 🎸 Multiple synthesis engines and instrument samples

## ✨ Features

- **Custom Language Syntax**: Write music using a clean, declarative syntax
- **Multiple Synthesis Modes**: Support for various synthesizers (saw, basic, guitar, etc.)
- **Real-time Parsing**: Instant syntax validation with error markers
- **ADSR Envelope Control**: Fine-tune attack, decay, sustain, and release
- **Effects Processing**: Built-in reverb and other audio effects
- **Scene Management**: Organize music into scenes with bar-based timing
- **Sample Library**: Load and use custom instrument samples
- **MIDI Integration**: Connect external MIDI devices for enhanced control
- **Visual Feedback**: Animated visualizer showing audio energy
- **Export Capabilities**: Export compositions to MP3/MP4 (in development)

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/theQuarky/leaf-music.git
cd leaf-music
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173` (or the URL shown in terminal)

## 📚 Language Syntax

### Basic Example

```leaf
tempo = 120
scale = "C minor"

track "lead" using synth("saw", { adsr:[0.01,0.1,0.2,0.2] }) {
  notes  [C4, D#4, G4, A#4]
  rhythm [1/8, 1/8, 1/4, 1/2]
  fx     reverb(0.25)
}

scene "drop" 16 bars { gain 1 }
```

### Language Features

#### Global Settings
```leaf
tempo = 120
scale = "C minor"
```

#### Track Definition
```leaf
track "trackName" using synth("synthType", { adsr:[attack, decay, sustain, release] }) {
  notes  [C4, D4, E4, F4]        // Musical notes
  rhythm [1/4, 1/4, 1/4, 1/4]    // Note durations (fractions of a bar)
  fx     reverb(0.25)             // Audio effects
}
```

#### Supported Synthesizers
- `basic` - Simple oscillator-based synth
- `saw` - Sawtooth wave synthesizer
- `guitar` - Guitar-style pluck synthesizer (with sample support)
- More synthesizers can be added through the Tone.js and smplr integration

#### Drums Track
```leaf
drums "rhythm" using samples("kit") {
  pattern ["kick", "snare", "kick", "snare"]
  rhythm  [1/4, 1/4, 1/4, 1/4]
}
```

#### Scene Management
```leaf
scene "intro" 8 bars { gain 0.8 }
scene "drop" 16 bars { gain 1 }
```

#### Note Notation
- Notes: `C4`, `D#4`, `Eb4`, `F5`, etc.
- Rhythm: Fractions like `1/4` (quarter note), `1/8` (eighth note), `1/2` (half note)
- Roman Numerals: `I`, `II`, `III`, `IV`, `V`, `VI`, `VII` for chord progressions

## 🛠️ Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on the codebase
- `npm test` - Run tests with Vitest

## 🏗️ Project Structure

```
leaf-music/
├── src/
│   ├── compiler/           # Language parser and grammar
│   │   ├── leafmusic.ohm   # Ohm grammar definition
│   │   ├── parser.ts       # Parser implementation
│   │   └── monarchGenerator.ts  # Monaco syntax highlighting
│   ├── audio/              # Audio engine
│   │   ├── player.ts       # Audio playback controller
│   │   ├── generator.ts    # Music spec generator
│   │   └── midi.ts         # MIDI integration
│   ├── __tests__/          # Test files
│   ├── App.tsx             # Main React component
│   └── main.tsx            # Application entry point
├── public/
│   └── samples/            # Instrument sample files
├── dist/                   # Production build output
└── package.json            # Dependencies and scripts
```

## 🔧 Technology Stack

- **Frontend Framework**: React 19.1 with TypeScript
- **Build Tool**: Vite 7.1
- **Audio Engine**: 
  - [Tone.js](https://tonejs.github.io/) - Web Audio framework
  - [smplr](https://www.npmjs.com/package/smplr) - Sample-based instruments
- **Parser**: [Ohm.js](https://ohmjs.org/) - Grammar-based parsing
- **Code Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code's editor
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript support

## 🎹 MIDI Support

Leaf Music supports Web MIDI API for connecting external MIDI controllers:

1. Click the "Request MIDI" button in the toolbar
2. Grant MIDI access when prompted by your browser
3. Connect your MIDI device
4. The console will show available MIDI inputs and outputs

## 🎸 Adding Custom Samples

To use custom instrument samples:

1. Create a folder in `public/samples/` with your instrument name (e.g., `guitar/`)
2. Add sample files named by note (e.g., `A4.mp3`, `C4.mp3`)
3. Supported formats: `.mp3`, `.wav`
4. Reference the instrument in your code:

```leaf
track "melody" using synth("guitar") {
  notes [E4, G4, A4]
}
```

**Note**: Ensure you have rights to use any samples you add (royalty-free or your own recordings).

## 🧪 Testing

The project uses Vitest for testing. Run tests with:

```bash
npm test
```

Test files are located in `src/__tests__/` and cover:
- Parser functionality and AST generation
- Note-to-frequency conversion
- Music specification generation

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Known Issues & Limitations

- Export to MP3/MP4 is currently a placeholder feature
- Sample-based instruments require manual sample file setup
- Some advanced Tone.js features are not yet exposed in the language

## 📝 Development Notes

### Parser Architecture

The compiler uses Ohm.js for parsing:
- Grammar defined in `leafmusic.ohm`
- Parser exports `parse()` for CST and `parseToAST()` for AST
- Semantic analysis produces a `MusicSpec` object for the audio engine

### Audio Engine

The audio system is built on Tone.js with additional smplr integration:
- `Player` class manages playback lifecycle
- `generator.ts` converts Leaf code to audio specifications
- Support for both synthesized and sample-based instruments

## 📄 License

This project is private and currently not licensed for public distribution.

## 🙏 Acknowledgments

- Built with [Tone.js](https://tonejs.github.io/) for professional-grade Web Audio
- Powered by [Ohm.js](https://ohmjs.org/) for language parsing
- Editor experience by [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- Sample-based instruments via [smplr](https://www.npmjs.com/package/smplr)

---

<div align="center">
Made with 🍃 by theQuarky
</div>
