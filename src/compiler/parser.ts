import ohm from 'ohm-js';
import { parseMusic } from '../audio/generator'
import type { MusicSpec } from '../audio/generator'

// Type definitions for better TypeScript support
export interface ParseResult {
  ok: true;
  cst: ohm.MatchResult;
}

export interface ParseError {
  ok: false;
  errors: string;
}

export type ParseResponse = ParseResult | ParseError;

const grammarSource = String.raw`
LeafMusic {
  Program
    = Statement*

  Statement
    = Assignment
    | TrackDecl
    | DrumsDecl
    | SceneDecl

  // ---------------------------
  // Assignments
  // ---------------------------
  Assignment
    = ident "=" Expr

  Expr
    = number
    | string
    | ident
    | ObjLit
    | ArrayLit
    | RomanNumeral

  // ---------------------------
  // Tracks
  // ---------------------------
  TrackDecl
    = "track" string "using" Synth Block

  Synth
    = "synth" "(" string ("," ObjLit)? ")"

  // ---------------------------
  // Drums
  // ---------------------------
  DrumsDecl
    = "drums" string "using" Samples Block

  Samples
    = "samples" "(" string ")"

  // ---------------------------
  // Scenes
  // ---------------------------
  SceneDecl
    = "scene" string number "bars" Block

  RomanNumeral
    = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII"

  // ---------------------------
  // Blocks
  // ---------------------------
  Block
    = "{" BlockStmt* "}"

  BlockStmt
    = NotesStmt
    | RhythmStmt
    | FxStmt
    | GainStmt
    | ArpStmt
    | PlayStmt
    | FollowStmt
    | HumanizeStmt
    | DrumLine

  NotesStmt
    = "notes" NoteList

  RhythmStmt
    = "rhythm" RhythmList

  FxStmt
    = "fx" FxList

  FxList
    = FxCall ("," FxCall)*

  FxCall
    = ident "(" ArgList? ")"

  ArgList
    = ListOf<Arg, ",">

  Arg
    = Expr
    | KeyValueArg

  KeyValueArg
    = ident "=" Expr

  GainStmt
    = "gain" number

  ArpStmt
    = "arp" "of" ArpSpec

  ArpSpec
    = "chords" "(" ProgRef ("," "dur" "=" TimeDur)? ")" "mode" string "rate" Duration

  PlayStmt
    = "play" PlayExpr

  PlayExpr
    = "chords" "(" ProgRef ("," "dur" "=" TimeDur)? ")" ("fx" FxList)?

  FollowStmt
    = "follow" FollowExpr

  FollowExpr
    = "roots" "(" ProgRef ")" ("." "down" "(" number "oct" ")")?

  HumanizeStmt
    = "humanize" "timing" TimeMs "," "velocity" number

  DrumLine
    = DrumPad "pattern" PatternString ("gain" number)?

  DrumPad
    = "kick" | "snare" | "hat" | "rim" | "clap" | "tom" | "ride" | "crash" | ident

  PatternString
    = "\"" ("x" | "-" | " ")+ "\""

  // ---------------------------
  // Core values
  // ---------------------------
  NoteList
    = "[" ListOf<Note, ","> "]"

  RhythmList
    = "[" ListOf<Duration, ","> "]"

  Duration
    = number "/" number

  TimeDur
    = number ("ms" | "s" | "beat" | "beats" | "bar" | "bars")

  TimeMs
    = number "ms"

  Note
    = pitch digit+

  pitch
    = "A".."G" ("#" | "b")?

  ident
    = letter (letter | digit)*

  number
    = digit+ ("." digit+)?  --float
    | digit+               --int

  string
    = "\"" (~"\"" any)* "\""

  ArrayLit
    = "[" ListOf<Expr, ",">? "]"

  ObjLit
    = "{" ListOf<ObjPair, ",">? "}"

  ObjPair
    = ident ":" Expr
  
  ProgRef
  = "progression"
  | ident
}
`;

// Create the grammar instance
const grammar = ohm.grammar(grammarSource);

/**
 * Parse LeafMusic source code
 * @param source - The source code string to parse
 * @returns Parse result with either success (CST) or error information
 */
export function parse(source: string): ParseResponse {
  try {
    const match = grammar.match(source);

    if (match.succeeded()) {
      return { ok: true, cst: match };
    }

    // Get error message from match result
    const errorMsg = (match as any).message ||
                     (match as any).getExpectedText?.() ||
                     'Parse error';

    return { ok: false, errors: errorMsg };
  } catch (error) {
    // Handle any unexpected errors during parsing
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: `Grammar error: ${errorMsg}` };
  }
}

export { grammar };

// --- New: validate with Ohm and return a MusicSpec AST ---
export interface ParseASTSuccess {
  ok: true
  ast: MusicSpec
}

export type ParseASTResponse = ParseASTSuccess | ParseError

/**
 * Validate source with Ohm grammar and return a MusicSpec-style AST
 * (uses the generator's lightweight extractor for the AST shape).
 */
export function parseToAST(source: string): ParseASTResponse {
  try {
    const match = grammar.match(source)
    if (!match.succeeded()) {
      const errorMsg = (match as any).message || 'Parse error'
      return { ok: false, errors: errorMsg }
    }

    // Use the existing parseMusic extractor to build a MusicSpec AST
    const ast = parseMusic(source)
    return { ok: true, ast }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { ok: false, errors: `Grammar error: ${errorMsg}` }
  }
}
