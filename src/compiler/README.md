# Compiler (parser)

This folder contains a minimal Ohm-based parser for the Leaf Music language.

- `parser.js` exports `parse(source)` which returns `{ ok: true, cst }` or `{ ok: false, errors }`.

Usage example:

```js
import { parse } from './compiler/parser'

const source = `track "Piano" using synth("basic") { notes ["C4"] }`
const result = parse(source)
if (!result.ok) console.error(result.errors)
else console.log(result.cst.toString())
```

Next steps:
- Implement a semantic analyzer that walks the CST and produces an AST.
- Add code generation to produce playable audio or export files.
