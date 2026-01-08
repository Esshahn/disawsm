# DisAWSM Project Overview

**Quick Start Guide for Claude Sessions**

Last Updated: 2026-01-08

## Project Summary

DisAWSM is a web-based 6502 disassembler that converts Commodore 64 PRG files (machine code binaries) into annotated assembly code. The project combines a Python-based disassembler engine ([disass.py](disass.py)) with a modern **Svelte 5** web interface.

**Goal:** Create a browser-based application where users can upload PRG files, view hex dumps, and generate disassembled 6502 assembly code.

---

## Technology Stack

### Frontend
- **Svelte 5.46.1** (modern reactive framework with runes)
- **TypeScript** (ES2017, strict mode)
- **Vite 7.3.0** (build tool with hot reload)
- **Svelte Stores** for reactive state management
- **LocalStorage** for persistence

### Backend/Logic
- **Python 3** ([disass.py](disass.py) - 418 lines)
  - Standalone 6502 disassembler
  - PRG file parser (first 2 bytes = start address)
  - Code/data analysis and label generation

### Build System
```bash
npm run dev    # Development server (http://localhost:5173)
npm run build  # Production build to dist/ (46.31 KB)
```

---

## Directory Structure

```
/Users/ingohinterding/github/disawsm/
├── index.html                 # Main HTML entry
├── package.json              # NPM config (v1.2.1)
├── tsconfig.json             # TypeScript config with $lib alias
├── vite.config.js            # Vite config with Svelte plugin
├── svelte.config.js          # Svelte 5 configuration
├── disass.py                 # Python disassembler (CLI tool)
│
├── src/
│   ├── App.svelte            # Root Svelte component
│   ├── main.ts               # Entry point (uses mount API)
│   │
│   └── lib/                  # Core application code (Svelte convention)
│       ├── components/
│       │   ├── ui/           # Generic UI components
│       │   │   ├── Window.svelte       # Draggable window component
│       │   │   ├── MenuBar.svelte      # Top menu bar
│       │   │   └── StatusBar.svelte    # Bottom status bar
│       │   ├── dialogs/      # Modal/dialog components
│       │   │   └── About.svelte        # About dialog
│       │   └── editor/       # Editor-specific components
│       │       ├── EditorWindow.svelte # Main editor window
│       │       └── HexViewer.svelte    # Hex dump viewer
│       │
│       ├── services/         # Business logic services
│       │   ├── fileLoader.ts # PRG file loading via HTML5 File API
│       │   └── storage.ts    # LocalStorage manager
│       │
│       ├── utils/            # Pure utility functions
│       │   └── dom.ts        # DOM manipulation utilities
│       │
│       ├── stores/           # Svelte stores for state management
│       │   └── app.ts        # Global application state
│       │
│       ├── config/           # Configuration
│       │   └── index.ts      # Default configuration
│       │
│       └── types/            # TypeScript type definitions
│           └── index.ts      # Shared interfaces (LoadedPRG, AppConfig)
│
├── public/
│   ├── css/
│   │   └── stylesheet.css   # Main CSS (1,686 lines)
│   └── ui/
│       ├── logo.svg         # Logo
│       └── bg_glossy.png    # Background texture
│
└── archive/
    └── old-class-based/     # Archived pre-Svelte 5 TypeScript files
```

---

## Key Components

### 1. App.svelte ([src/App.svelte](src/App.svelte))
Main application component using Svelte 5 runes:
- Uses `$state()` for reactive local variables
- Initializes Storage, FileLoader, and manages global state
- Handles menu events (loadPRG, saveAssembly, showAbout, clear)
- Manages keyboard shortcuts and About dialog visibility

### 2. Window.svelte ([src/lib/components/ui/Window.svelte](src/lib/components/ui/Window.svelte))
Reusable draggable window component:
- Uses `$props()` for component props
- Uses `$state()` for reactive drag state
- Implements drag-and-drop with `svelte:window` event listeners
- Z-index management for window stacking
- `{@render children?.()}` for slot content

### 3. HexViewer.svelte ([src/lib/components/editor/HexViewer.svelte](src/lib/components/editor/HexViewer.svelte))
Hex dump display component:
- Shows 16 bytes per line, grouped by 4
- Displays ASCII representation
- Uses `$derived()` for reactive hex line formatting
- Format: `e5cf:  85 cc 8d 92  02 f0 f7 78  ...  .�...��x`

### 4. Stores ([src/lib/stores/app.ts](src/lib/stores/app.ts))
Svelte reactive stores:
- `loadedFile` - writable store for loaded PRG file
- `assemblyOutput` - writable store for disassembled code
- `status` - derived store for status bar message
- `saveDisabled` - derived store for menu state
- `config` - writable store for app configuration

### 5. FileLoader ([src/lib/services/fileLoader.ts](src/lib/services/fileLoader.ts))
Service for loading PRG files:
- Creates hidden file input element
- Parses PRG format (2-byte little-endian start address)
- Returns `LoadedPRG` interface with name, startAddress, bytes
- Validates file size (max 64KB for 6502)

### 6. disass.py ([disass.py:1-419](disass.py#L1-L419))
Python disassembler engine (to be ported to TypeScript):
- **load_file()** - Reads PRG files, extracts start address
- **analyze()** - Distinguishes code from data
- **convert_to_program()** - Generates assembly output

---

## Svelte 5 Architecture

### State Management
- **Runes** for reactivity: `$state()`, `$derived()`, `$props()`
- **Stores** for global state: writable, derived
- **No compatibility mode** - pure Svelte 5 syntax

### Component Communication
- **Props**: Using `$props()` destructuring
- **Events**: Function props (e.g., `onloadPRG`, `onclose`)
- **Stores**: Reactive subscriptions with `$` prefix

### Modern Patterns
- `mount()` API instead of `new App()`
- `{@render children?.()}` instead of `<slot />`
- `onclick` instead of `on:click`
- Path aliases: `$lib/...` for clean imports

---

## How the Python Disassembler Works

### PRG File Format
```
Byte 0-1: Start address (little-endian, e.g., $00,$10 = $1000)
Byte 2+:  Machine code bytes
```

### Analysis Algorithm ([disass.py:236-343](disass.py#L236-L343))

1. **Generate byte array** - Each byte gets metadata:
   ```python
   {
     "addr": 0x1000,      # Memory address
     "byte": "a9",        # Hex value
     "dest": 0,           # Is jump/branch target?
     "code": 0,           # Is code?
     "data": 0            # Is data?
   }
   ```

2. **Apply entrypoints** - Mark known code/data sections from [entrypoints.json](src/json/entrypoints.json)

3. **Analyze code flow**:
   - Start from entrypoints
   - Follow JMP/JSR/branch instructions
   - Mark destinations as code
   - Mark data access targets as data
   - Default to data after RTS/RTI/JMP

4. **Generate labels** - Create `lXXXX` labels for all jump/branch targets

### Output Format ([disass.py:100-199](disass.py#L100-L199))
```asm
; converted with pydisass6502 by awsm of mayday!

* = $1000

            lda #$93
            jsr $ffd2
            ldx #$00

l1008       lda l1018,x        ; data reference
            beq l1016
            jsr $ffd2
            inx
            jmp l1008

l1016       rts

l1018       !byte $48, $45, $4c
```

---

## Data Files

### opcodes.json ([src/json/opcodes.json:1-883](src/json/opcodes.json#L1-L883))
Maps opcode hex codes to instructions:
```json
{
  "a9": {"ins": "lda #$hh"},
  "ad": {"ins": "lda $hhll"},
  "4c": {"ins": "jmp $hhll"},
  "02": {"ins": "jam", "ill": 1}
}
```
- `hh` = high byte placeholder
- `ll` = low byte placeholder
- `ill: 1` = illegal/undocumented opcode

### c64-mapping.json ([src/json/c64-mapping.json:1-172](src/json/c64-mapping.json#L1-L172))
Commodore 64 memory map comments:
```json
{
  "mapping": [
    {"addr": "d020", "comm": "border color"},
    {"addr": "d021", "comm": "background color"},
    {"addr": "0400", "comm": "start of screen memory"}
  ]
}
```

### entrypoints.json ([src/json/entrypoints.json:1-6](src/json/entrypoints.json#L1-L6))
User-defined hints for analysis:
```json
{
  "entrypoints": [
    {"addr": "c0b2", "mode": "code"},
    {"addr": "c174", "mode": "code"}
  ]
}
```

---

## Current Features (Phase 1-2 Complete)

### Phase 1: File Loading ✅
- File menu with "Load PRG..." option
- FileLoader service using HTML5 File API
- Status bar updates with file info
- Reactive state management with stores

### Phase 2: Hex Viewer ✅
- HexViewer component displays loaded files
- 16 bytes per line, grouped by 4
- ASCII representation column
- Address column in hex format
- Scrollable for large files

---

## Next Steps (Phase 3+)

### Phase 3: Disassembler Integration (NEXT)
- Port Python disassembler logic to TypeScript
- Implement opcode lookup from opcodes.json
- Code/data analysis algorithm
- Label generation
- Assembly output formatting

### Phase 4: Assembly Viewer
- Display disassembled code in editor
- Syntax highlighting
- Line numbers
- Label navigation

### Phase 5: File Export
- Save assembly to .asm file
- Export configuration
- Download functionality

### Phase 6: Advanced Features
- Entrypoints editor
- C64 memory map annotations
- Interactive disassembly settings

---

## UI Architecture

### Component Hierarchy
```
App.svelte
├── MenuBar (ui)
├── EditorWindow (editor)
│   ├── Window (ui)
│   └── HexViewer (editor)
├── StatusBar (ui)
└── About (dialogs)
```

### Styling
- Dark theme with custom colors
- CSS variables in [public/css/stylesheet.css](public/css/stylesheet.css)
- Dotted background pattern
- Quicksand font family
- Component-scoped styles in `.svelte` files

---

## Storage & Configuration

### config/index.ts ([src/lib/config/index.ts](src/lib/config/index.ts))
Default configuration:
```typescript
{
  version: "26.01.04",
  window_editor: {
    left: 50,
    top: 50,
    closeable: false
  },
  filename: "mycode"
}
```

### Storage Service ([src/lib/services/storage.ts](src/lib/services/storage.ts))
- Merges defaults with localStorage
- Version comparison for updates
- Auto-save functionality
- Separate storage for work data

---

## Important Notes

### Code Style
- **Svelte 5 runes** for reactivity
- TypeScript strict mode enabled
- Modern ES2017+ features
- Path aliases (`$lib/...`) for clean imports
- Component-based architecture

### Build Output
- Bundle size: **46.31 KB** (gzipped: 17.41 KB)
- Pure Svelte 5 (no compatibility mode)
- Production-ready optimizations

### Browser Features
- HTML5 File API for file loading
- LocalStorage for persistence
- Client-side processing only
- No backend required

---

## Quick Reference Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Python disassembler (standalone)
python disass.py -i input.prg -o output.asm -e entrypoints.json
```

---

## Key Files to Understand

For new features:
1. [App.svelte](src/App.svelte) - Root component
2. [lib/stores/app.ts](src/lib/stores/app.ts) - Global state
3. [lib/services/fileLoader.ts](src/lib/services/fileLoader.ts) - File loading
4. [lib/components/editor/HexViewer.svelte](src/lib/components/editor/HexViewer.svelte) - Hex display
5. [disass.py](disass.py) - Disassembly logic to port (Phase 3)
6. [lib/types/index.ts](src/lib/types/index.ts) - TypeScript interfaces

---

## Version History

- v26.01.08 - **Svelte 5 Migration Complete**
  - Converted to pure Svelte 5 with runes
  - Refactored to modern `lib/` structure
  - Implemented Phases 1-2 (file loading + hex viewer)
  - Bundle size: 46.31 KB
- v26.01.04 - Initial version with class-based architecture
