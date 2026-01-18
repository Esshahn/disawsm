# DISAWSM Status - Claude Context File

> Token-efficient codebase summary. Read this first to understand the project.

## What Is This?

Browser-based 6502 disassembler for C64 PRG files. Svelte 5 + TypeScript + Vite.

## Architecture

```
src/
├── App.svelte              # Root: session mgmt, window orchestration, keyboard shortcuts
├── lib/
│   ├── stores/             # Svelte stores (state)
│   │   ├── app.ts          # loadedFile, assemblyOutput, config, derived: status/saveDisabled
│   │   ├── entrypoints.ts  # Entrypoint[] {id, address, type:'code'|'data'}
│   │   ├── labels.ts       # CustomLabel[] {address, name} - persisted
│   │   ├── comments.ts     # CustomComment[] {address, comment} - persisted
│   │   └── settings.ts     # UserSettings {labelPrefix, assemblerSyntax, customSyntax}
│   ├── services/
│   │   ├── enhancedDisassembler.ts  # CORE: analyze() + convertToProgram()
│   │   ├── disassembler.ts          # Simple disasm (no flow analysis, used by Monitor)
│   │   ├── fileLoader.ts            # Load PRG files
│   │   ├── projectFile.ts           # Save/load .dis project files
│   │   ├── sessionStorage.ts        # Auto-save to localStorage
│   │   ├── assemblyExporter.ts      # Export .asm files
│   │   ├── syntaxService.ts         # Load assembler syntax defs
│   │   ├── syntaxHighlight.ts       # Color scheme loading
│   │   └── patternService.ts        # Byte pattern matching
│   ├── components/
│   │   ├── editor/
│   │   │   ├── DisassemblerWindow.svelte  # Main asm view, virtual scroll, inline edit
│   │   │   ├── MonitorWindow.svelte       # Hex viewer + PETSCII
│   │   │   ├── EntrypointsWindow.svelte   # Add/remove code/data entrypoints
│   │   │   ├── LabelsWindow.svelte        # Label list + edit
│   │   │   └── InfoWindow.svelte          # File info + drag/drop zone
│   │   ├── ui/
│   │   │   ├── Window.svelte              # Draggable/resizable container
│   │   │   ├── VirtualScroller.svelte     # Perf: only renders visible lines
│   │   │   ├── MenuBar.svelte             # File/View/disawsm menus
│   │   │   └── StatusBar.svelte           # Bottom status display
│   │   └── dialogs/
│   │       ├── About.svelte
│   │       └── Settings.svelte
│   ├── types/index.ts      # LoadedPRG, WindowConfig, AppConfig, UserSettings, ProjectFile
│   └── config/index.ts     # Default window positions/sizes
dist/json/
├── opcodes.json            # 6502 opcodes: {ins, len, mode, cycles, flow?, ill?}
├── c64-mapping.json        # C64 memory map for auto-comments
├── syntax.json             # Assembler syntaxes (ACME, Kick, Turbo)
├── syntax-highlight.json   # Color scheme
└── patterns.json           # Byte patterns for code detection
```

## Core Data Flow

```
Load PRG → loadedFile store → triggers auto-disassembly
                              ↓
User sets entrypoints → entrypoints store → triggers disassembly
                              ↓
enhancedDisassembler.disassembleWithEntrypoints():
  1. analyze() - classify bytes as code/data via worklist algorithm
  2. convertToProgram() - generate DisassembledLine[]
                              ↓
assemblyOutput store → DisassemblerWindow renders with virtual scroll
```

## Key Types

```typescript
// Byte classification during analysis
type ByteState = 'unknown' | 'code' | 'data';

interface DisassembledByte {
  addr: number;
  byte: number;
  state: ByteState;
  isTarget: boolean;      // Jump/branch target? (generates label)
  userMarked: boolean;    // User entrypoint? (respects even illegal opcodes)
  xrefs: number[];        // Who references this?
}

interface DisassembledLine {
  address: number;
  label?: string;
  instruction: string;
  comment?: string;
  xrefComment?: string;
  bytes: number[];
  isData?: boolean;
}

interface Entrypoint { id: string; address: number; type: 'code' | 'data'; }
interface CustomLabel { address: number; name: string; }
interface CustomComment { address: number; comment: string; }
```

## Disassembler Algorithm (enhancedDisassembler.ts)

**analyze()** - Classification pass:
1. Process user entrypoints (highest priority): mark code/data, add code to worklist
2. Pattern matching: find known sequences, add to worklist if unknown
3. Worklist loop:
   - Skip if data or visited
   - Invalid/illegal opcode + not userMarked → mark as data
   - Valid opcode → mark as code, mark operand bytes as code
   - Extract target address:
     - Control flow (JMP/JSR/Bxx) → target is code, add to worklist
     - Data access (LDA/STA/etc) → target is data (if unknown)
   - Follow fall-through unless jump/return

**convertToProgram()** - Output pass:
- Generate labels for targets (custom or auto: prefix + hex addr)
- Format instructions with proper syntax
- Group data bytes (up to 8 per line)
- Add comments (C64 map auto-comments, custom override)
- Add XREF comments

## Important Behaviors

- **Label validation**: `/^[a-zA-Z_][a-zA-Z0-9_-]*$/`
- **Label prefix**: Configurable in settings, default `_`
- **Virtual scroll**: 21px line height, only visible rows rendered
- **Auto-save**: Session saved to localStorage on changes
- **Address formats accepted**: `$xxxx`, `0xxxxx`, `xxxx` (all hex)

## localStorage Keys

```
disawsm_userconfig   # Window positions
disawsm_labels       # Custom labels
disawsm_comments     # Custom comments
disawsm_settings     # User prefs
disawsm_session      # Auto-saved session
```

## File Formats

**PRG**: 2-byte little-endian start address + raw bytes
**Project (.dis)**: JSON with version, name, startAddress, bytes[], entrypoints[], labels[], comments[]
**Assembly (.asm)**: Text output with header, formatted per assembler syntax

## What's Implemented

- ✅ Two-pass disassembly (analyze + convert)
- ✅ Entrypoint-driven code/data separation
- ✅ Pattern matching for auto-detection
- ✅ XREFs tracking
- ✅ Read vs Jump distinction (LDA→data, JMP→code)
- ✅ Custom labels and comments
- ✅ C64 memory map auto-comments
- ✅ Multiple assembler syntax (ACME, Kick, Turbo)
- ✅ Illegal opcode handling
- ✅ Virtual scrolling for performance
- ✅ Session auto-save/restore
- ✅ Project file save/load

## What's NOT Implemented (see PLAN.md)

- ❌ BASIC stub detection ($0801 auto-detect)
- ❌ Subroutine detection (JSR targets vs JMP targets)
- ❌ Immediate value recognition (LDA #$41 → LDA #'A')
- ❌ Text detection in data (!text "HELLO" vs !byte)
- ❌ Zero page usage tracking
- ❌ Cycle display
- ❌ Dead code detection
- ❌ Confidence scoring

## Common Tasks

**Add new assembler syntax**: Add to dist/json/syntax.json
**Add memory map comments**: Add to dist/json/c64-mapping.json
**Add code patterns**: Add to dist/json/patterns.json
**Change label prefix**: Settings dialog or settings store

## Gotchas

1. JSON files fetched at runtime (not bundled) - must be in dist/json/
2. opcodes.json uses template vars: `$hh` (1 byte), `$hhll` (2 bytes), `ll` (lo), `hh` (hi)
3. Svelte 5 runes used - not classic reactive statements
4. Window configs in both AppConfig (defaults) and UserConfig (persisted)
5. DisassemblerWindow uses `scrollTop` + `scrollIntoView` - avoid scrollTo on data changes

## Finishing a Task

When the user asks to "finish the task", this means that you
- review the code you've written and look if it needs to be cleaned up or refactored to be simpler, more elegant, more maintainable.
- update this document to remain up to date