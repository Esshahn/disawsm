# DisAWSM Project Overview

**Quick Start Guide for Claude Sessions**

Last Updated: 2026-01-10

## Project Summary

DisAWSM is a **web-based 6502 disassembler** that converts Commodore 64 PRG files (machine code binaries) into annotated assembly code. The project combines a Python-based disassembler engine ([disass.py](disass.py)) with a modern **Svelte 5** web interface.

**Goal:** Create a browser-based application where users can upload PRG files, view hex dumps, manage entrypoints, and generate high-quality disassembled 6502 assembly code with labels and C64 memory map comments.

**Current Version:** 26.01.09.6 (Phase 4 of 6 complete)

---

## Technology Stack

### Frontend
- **Svelte 5.46.1** (modern reactive framework with runes)
- **TypeScript** (ES2017, strict mode)
- **Vite 7.3.0** (build tool with hot reload)
- **Svelte Stores** for reactive state management
- **LocalStorage** for configuration persistence

### Backend/Logic
- **Python 3** ([disass.py](disass.py) - 418 lines)
  - Standalone 6502 disassembler (reference implementation)
  - PRG file parser (first 2 bytes = start address)
  - Code/data analysis and label generation
- **TypeScript ports** of all Python logic now complete

### Build System
```bash
npm run dev    # Development server (http://localhost:5173)
npm run build  # Production build to dist/ (75.74 KB, gzipped: 26.20 KB)
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
├── disass.py                 # Python disassembler (reference)
│
├── src/
│   ├── App.svelte            # Root component
│   ├── main.ts               # Entry point (uses mount API)
│   │
│   └── lib/                  # Core application code
│       ├── components/
│       │   ├── ui/           # Generic UI components
│       │   │   ├── Window.svelte       # Draggable/resizable windows
│       │   │   ├── MenuBar.svelte      # Menu system (File, View, Help)
│       │   │   ├── StatusBar.svelte    # Bottom status bar
│       │   │   ├── VirtualScroller.svelte # High-performance list rendering
│       │   │   └── JumpToAddress.svelte   # Address navigation
│       │   ├── dialogs/      # Modal/dialog components
│       │   │   └── About.svelte        # About dialog
│       │   └── editor/       # Editor-specific components
│       │       ├── EditorWindow.svelte      # Hex dump window (Data Viewer)
│       │       ├── HexViewer.svelte         # Hex dump display with PETSCII
│       │       ├── CodeViewWindow.svelte    # Basic disassembly window
│       │       ├── CodeView.svelte          # Basic disassembly (no analysis)
│       │       ├── DisassemblerWindow.svelte # Advanced disassembly window
│       │       ├── InfoWindow.svelte        # File info + drag-and-drop
│       │       └── EntrypointsWindow.svelte # Entrypoint editor
│       │
│       ├── services/         # Business logic services
│       │   ├── fileLoader.ts            # PRG file loading via HTML5 File API
│       │   ├── disassembler.ts          # Basic disassembly (no analysis)
│       │   ├── enhancedDisassembler.ts  # Advanced disassembly with entrypoints
│       │   ├── petsciiCharset.ts        # PETSCII charset sprite sheet generation
│       │   └── storage.ts               # LocalStorage manager
│       │
│       ├── utils/            # Pure utility functions
│       │   ├── dom.ts        # DOM manipulation utilities
│       │   └── format.ts     # Number formatting (toHex)
│       │
│       ├── stores/           # Svelte stores for state management
│       │   ├── app.ts             # Global application state (file, config, assembly)
│       │   ├── entrypoints.ts     # Code/data entry points
│       │   └── windowManager.ts   # Z-index management
│       │
│       ├── config/           # Configuration
│       │   └── index.ts      # Default window configurations
│       │
│       └── types/            # TypeScript type definitions
│           └── index.ts      # Shared interfaces (LoadedPRG, AppConfig, etc.)
│
├── public/
│   ├── css/
│   │   └── stylesheet.css   # Main CSS (1,686 lines)
│   ├── ui/
│   │   ├── logo.svg         # Logo
│   │   └── bg_glossy.png    # Background texture
│   ├── json/
│   │   ├── opcodes.json         # 256 6502 opcodes with addressing modes
│   │   ├── c64-mapping.json     # Commodore 64 memory map (171 entries)
│   │   └── entrypoints.json     # User-defined hints (deprecated)
│   └── charset/
│       └── petscii.png      # PETSCII character sprite sheet
│
└── archive/
    └── old-class-based/     # Archived pre-Svelte 5 TypeScript files
```

---

## Key Components

### 1. App.svelte ([src/App.svelte](src/App.svelte))
Main application component using Svelte 5 runes:
- Initializes Storage, FileLoader services
- Manages window visibility states
- Handles menu events (loadPRG, saveAssembly, showAbout, clear, toggleWindow)
- Coordinates file loading with entrypoint auto-addition
- Manages keyboard shortcuts and About dialog

### 2. Window.svelte ([src/lib/components/ui/Window.svelte](src/lib/components/ui/Window.svelte))
Reusable draggable/resizable window component:
- Drag-and-drop with `svelte:window` event listeners
- Z-index management for window stacking (via windowManager store)
- Configuration persistence to localStorage
- `{@render children?.()}` for slot content
- Close button support (when closeable)

### 3. HexViewer.svelte ([src/lib/components/editor/HexViewer.svelte](src/lib/components/editor/HexViewer.svelte))
Hex dump display with PETSCII preview:
- Configurable bytes per line (8, 16, 32)
- VirtualScroller for performance with large files
- PETSCII character sprite sheet display
- Byte hover tooltips with address and value
- Format: `e5cf:  85 cc 8d 92  02 f0 f7 78  ...  .�...��x`

### 4. DisassemblerWindow.svelte ([src/lib/components/editor/DisassemblerWindow.svelte](src/lib/components/editor/DisassemblerWindow.svelte))
Advanced disassembly with entrypoint analysis:
- Uses enhancedDisassembler.ts for code/data analysis
- Label generation (lXXXX format) for jump/branch targets
- C64 memory map comment integration (toggle on/off)
- VirtualScroller for performance
- Jump to address navigation
- Visual distinction for data sections (orange border)
- Byte tooltips showing address and hex values

### 5. EntrypointsWindow.svelte ([src/lib/components/editor/EntrypointsWindow.svelte](src/lib/components/editor/EntrypointsWindow.svelte))
Entrypoint editor for code/data hints:
- Add/remove entrypoints by address
- Toggle between code and data types
- List view showing all entrypoints
- Reactive updates trigger re-analysis

### 6. Stores ([src/lib/stores/](src/lib/stores/))

**app.ts** - Global application state:
- `loadedFile` - writable store for loaded PRG file
- `assemblyOutput` - writable store for disassembled code (future)
- `status` - derived store for status bar message
- `saveDisabled` - derived store for menu state
- `config` - writable store for app configuration
- `loadPRGFile()` - centralized file loading with entrypoint auto-add
- `updateWindowConfig()` - window state persistence

**entrypoints.ts** - Code/data entry points:
- `entrypoints` - writable store for analysis hints
- `add()`, `remove()`, `clear()`, `toggle()` methods
- Reactive updates trigger disassembly re-analysis

**windowManager.ts** - Z-index management:
- `bringToFront()` - Window stacking order
- Prevents z-index conflicts

### 7. Services

**fileLoader.ts** ([src/lib/services/fileLoader.ts](src/lib/services/fileLoader.ts))
PRG file loading:
- HTML5 File API integration
- Drag-and-drop support
- PRG format parsing (2-byte little-endian start address)
- File validation (max 64KB for 6502)

**enhancedDisassembler.ts** ([src/lib/services/enhancedDisassembler.ts](src/lib/services/enhancedDisassembler.ts))
Advanced disassembly with entrypoint analysis:
- `analyze()` - Code/data section identification
- `convertToProgram()` - Assembly output generation
- `disassembleWithEntrypoints()` - Main API
- C64 memory map comment lookup
- Label generation for jump targets
- Data byte grouping (up to 8 per line)

**storage.ts** ([src/lib/services/storage.ts](src/lib/services/storage.ts))
Configuration persistence:
- LocalStorage read/write
- Version comparison (handles numeric and date-based)
- Config merging (defaults + user overrides)
- Auto-save on window drag/resize

---

## Svelte 5 Architecture

### State Management
- **Runes** for reactivity: `$state()`, `$derived()`, `$props()`, `$effect()`
- **Stores** for global state: writable, derived
- **No compatibility mode** - pure Svelte 5 syntax

### Component Communication
- **Props**: Using `$props()` destructuring
- **Events**: Function props (e.g., `onloadPRG`, `onclose`, `onjump`)
- **Stores**: Reactive subscriptions with `$` prefix

### Modern Patterns
- `mount()` API instead of `new App()`
- `{@render children?.()}` instead of `<slot />`
- `onclick` instead of `on:click`
- Path aliases: `$lib/...` for clean imports
- `{#snippet}` for reusable template blocks

---

## How the Disassembler Works

### PRG File Format
```
Byte 0-1: Start address (little-endian, e.g., $00,$10 = $1000)
Byte 2+:  Machine code bytes
```

### Enhanced Disassembly Algorithm

**Two-Pass Analysis:**

**Pass 1: Analyze** ([enhancedDisassembler.ts:97-212](src/lib/services/enhancedDisassembler.ts#L97-L212))

1. **Generate byte array** - Each byte gets metadata:
   ```typescript
   {
     addr: 0x1000,      // Memory address
     byte: "a9",        // Hex value
     dest: false,       // Is jump/branch target?
     code: false,       // Is code?
     data: false        // Is data?
   }
   ```

2. **Apply entrypoints** - Mark known code/data sections from entrypoints store

3. **Analyze code flow**:
   - Start from entrypoints (including auto-added start address)
   - Follow JMP/JSR/branch instructions
   - Mark destinations as code
   - Mark data access targets (LDA, STA) as data
   - Default to data after RTS/RTI/JMP

**Pass 2: Convert** ([enhancedDisassembler.ts:288-378](src/lib/services/enhancedDisassembler.ts#L288-L378))

1. **Generate labels** - Create `lXXXX` labels for all jump/branch targets

2. **Format instructions**:
   - Replace absolute addresses with labels (if within program)
   - Add C64 memory map comments for known addresses
   - Group consecutive data bytes (up to 8 per line)

3. **Extract comments** - Look up addresses in c64-mapping.json

### Output Format
```asm
* = $1000

            lda #$93
            jsr $ffd2          ; CHROUT
            ldx #$00

l1008       lda l1018,x
            beq l1016
            jsr $ffd2          ; CHROUT
            inx
            jmp l1008

l1016       rts

l1018       !byte $48, $45, $4c, $4c, $4f, $0d, $00
```

---

## Data Files

### opcodes.json ([public/json/opcodes.json](public/json/opcodes.json))
Maps opcode hex codes to instructions:
```json
{
  "a9": {"ins": "lda #$hh"},
  "ad": {"ins": "lda $hhll"},
  "4c": {"ins": "jmp $hhll"},
  "10": {"ins": "bpl $hh", "rel": 1},
  "02": {"ins": "jam", "ill": 1}
}
```
- `hh` = high byte placeholder
- `ll` = low byte placeholder
- `rel: 1` = relative addressing (branches)
- `ill: 1` = illegal/undocumented opcode

### c64-mapping.json ([public/json/c64-mapping.json](public/json/c64-mapping.json))
Commodore 64 memory map comments (171 entries):
```json
{
  "mapping": [
    {"addr": "d020", "comm": "border color"},
    {"addr": "d021", "comm": "background color"},
    {"addr": "0400", "comm": "start of screen memory"},
    {"addr": "ffd2", "comm": "CHROUT"}
  ]
}
```

### entrypoints.json ([public/json/entrypoints.json](public/json/entrypoints.json))
**Deprecated** - Now stored in entrypoints store, not used:
```json
{
  "entrypoints": [
    {"addr": "c0b2", "mode": "code"},
    {"addr": "c174", "mode": "code"}
  ]
}
```

---

## Implemented Features (Phases 1-4 Complete)

### Phase 1: File Loading ✅
- File menu with "Load PRG..." option
- FileLoader service using HTML5 File API
- Drag-and-drop support in InfoWindow
- Status bar updates with file info
- Reactive state management with stores

### Phase 2: Hex Viewer ✅
- HexViewer component with VirtualScroller
- Configurable bytes per line (8, 16, 32)
- PETSCII character preview
- ASCII representation column
- Address column in hex format
- Byte hover tooltips
- Efficient rendering for 64KB files

### Phase 3: Basic Disassembly ✅
- CodeView component for basic disassembly
- Opcode lookup from opcodes.json
- Instruction formatting (immediate, absolute, relative)
- No code/data analysis (raw sequential disassembly)

### Phase 4: Advanced Disassembly ✅
- DisassemblerWindow with entrypoint-based analysis
- EntrypointsWindow for managing code/data hints
- Label generation (lXXXX format)
- C64 memory map comment integration
- Toggle comments on/off
- Visual code/data distinction (orange border for data)
- Data byte grouping (ACME syntax: `!byte $xx, $yy, $zz`)
- Auto-add start address as code entrypoint
- Jump to address navigation
- VirtualScroller for performance

---

## Upcoming Features (Phases 5-6 Planned)

### Phase 5: File Export (NEXT)
- Save assembly to .asm file
- Download via browser
- Custom filename input
- Export current disassembly

### Phase 6: Advanced Features
- Entrypoint persistence (save/load)
- Assembler format options (ACME, Kick Assembler)
- Export configuration settings
- Batch processing support
- Enhanced comment editing

---

## UI Architecture

### Component Hierarchy
```
App.svelte
├── MenuBar (ui)
│   ├── disawsm menu (About)
│   ├── File menu (Load, Save, Clear)
│   ├── View menu (window toggles with checkmarks)
│   └── Help menu (README, website)
├── EditorWindow (editor) - "Data Viewer"
│   ├── Window (ui)
│   └── HexViewer (editor)
├── CodeViewWindow (editor) - "Code Viewer"
│   ├── Window (ui)
│   └── CodeView (editor)
├── DisassemblerWindow (editor) - "Disassembler"
│   ├── Window (ui)
│   ├── JumpToAddress (ui)
│   ├── Toggle comments checkbox
│   └── VirtualScroller (ui)
├── InfoWindow (editor) - "Info"
│   ├── Window (ui)
│   └── Drag-and-drop zone
├── EntrypointsWindow (editor) - "Entrypoints"
│   ├── Window (ui)
│   └── Entrypoint list + editor
├── StatusBar (ui)
└── About (dialogs)
```

### Window Management
- All windows draggable and resizable
- Positions/sizes saved to localStorage
- Z-index management prevents conflicts
- Windows require loaded file (except Info)
- View menu shows checkmarks for visible windows
- Checkmarks reflect actual visibility (accounts for file dependency)

### Styling
- Dark theme with custom colors
- CSS variables in [public/css/stylesheet.css](public/css/stylesheet.css)
- Dotted background pattern
- Quicksand font family (UI), Courier New (code)
- Component-scoped styles in `.svelte` files
- Accent color: `#00c698` (cyan)
- Data section color: `#ffaa00` (orange)
- Comment color: `#888888` (grey)

---

## Storage & Configuration

### config/index.ts ([src/lib/config/index.ts](src/lib/config/index.ts))
Default configuration for all windows:
```typescript
{
  version: "26.01.09.6",
  window_editor: {
    top: 50,
    left: 210,
    width: 700,
    height: 600,
    autoOpen: true,
    closeable: true,
    isOpen: true,
    resizable: true,
    bytesPerLine: 16
  },
  window_disassembler: {
    top: 50,
    left: 1200,
    width: 600,
    height: 600,
    autoOpen: true,
    closeable: true,
    isOpen: true,
    resizable: true
  },
  // ... similar for window_codeview, window_info, window_entrypoints
}
```

### Storage Service ([src/lib/services/storage.ts](src/lib/services/storage.ts))
- Merges defaults with localStorage
- Version comparison (handles both numeric "1.51" and date "26.01.09" formats)
- Selective merge (only user-adjustable properties)
- Auto-save on window drag/resize
- Separate storage for work data (future)

---

## Performance Optimizations

### Virtual Scrolling
- VirtualScroller only renders visible items (~100 lines)
- Handles 64KB files efficiently
- Fixed line height for accurate scrollbar sizing
- Smooth scrolling with requestAnimationFrame

### Reactive Patterns
- `$derived()` for computed values (cached until dependencies change)
- `$effect()` for side effects (disassembly re-analysis)
- Store subscriptions only where needed
- Minimal re-renders with targeted reactivity

### CSS Optimization
- `contain: layout style paint` for layout containment
- Component-scoped styles prevent global pollution
- CSS Grid for efficient layouts

### Asset Loading
- Lazy PETSCII charset loading (only when HexViewer visible)
- JSON files fetched dynamically (no build-time bundling)
- Sprite sheet optimization for PETSCII display

---

## Important Notes

### Code Style
- **Svelte 5 runes** for all reactivity
- TypeScript strict mode enabled
- Modern ES2017+ features
- Path aliases (`$lib/...`) for clean imports
- Component-based architecture
- Functional programming patterns

### Build Output
- Bundle size: **75.74 KB** (gzipped: 26.20 KB)
- Pure Svelte 5 (no compatibility mode)
- Production-ready optimizations
- Tree-shaking enabled
- No source maps in production

### Browser Features
- HTML5 File API for file loading
- LocalStorage for persistence
- Drag-and-drop for file uploads
- Client-side processing only
- No backend required
- Works offline after initial load

### Git Status
- **Current branch:** `disassembler`
- **Status:** Clean (no uncommitted changes)
- **Recent commits:** Labels working, C64 comments, entrypoint analysis

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:5173

# Production build
npm run build            # Build to dist/ (75.74 KB)

# Python disassembler (standalone reference)
python disass.py -i input.prg -o output.asm -e entrypoints.json

# Git
git status              # Check current state
git log --oneline -20   # Recent commits
```

---

## Key Files to Understand

### For new features:
1. [App.svelte](src/App.svelte) - Root component, service initialization
2. [lib/stores/app.ts](src/lib/stores/app.ts) - Global state management
3. [lib/stores/entrypoints.ts](src/lib/stores/entrypoints.ts) - Entrypoint management
4. [lib/services/enhancedDisassembler.ts](src/lib/services/enhancedDisassembler.ts) - Core disassembly logic
5. [lib/types/index.ts](src/lib/types/index.ts) - TypeScript interfaces

### For UI work:
1. [lib/components/ui/Window.svelte](src/lib/components/ui/Window.svelte) - Window wrapper
2. [lib/components/ui/VirtualScroller.svelte](src/lib/components/ui/VirtualScroller.svelte) - List rendering
3. [lib/components/editor/DisassemblerWindow.svelte](src/lib/components/editor/DisassemblerWindow.svelte) - Main disassembly UI
4. [public/css/stylesheet.css](public/css/stylesheet.css) - Global styles

### For algorithms:
1. [disass.py](disass.py) - Reference Python implementation
2. [lib/services/enhancedDisassembler.ts](src/lib/services/enhancedDisassembler.ts) - TypeScript port
3. [public/json/opcodes.json](public/json/opcodes.json) - Opcode definitions

---

## Version History

- **v26.01.09.6** - Current (Phase 4 complete)
  - Entrypoint-based code/data analysis
  - C64 memory map comment integration
  - Label generation for jump targets
  - Visual code/data distinction
  - VirtualScroller performance optimization
  - View menu with window toggles
  - Auto-add start address as entrypoint

- **v26.01.08** - Svelte 5 Migration Complete
  - Converted to pure Svelte 5 with runes
  - Refactored to modern `lib/` structure
  - Implemented Phases 1-2 (file loading + hex viewer)
  - Bundle size: 46.31 KB

- **v26.01.04** - Initial version with class-based architecture

---

## Architecture Insights

### State Flow Pattern
```
User Interaction
    ↓
Event Handler (App.svelte)
    ↓
Service Layer (FileLoader, Disassembler)
    ↓
Store Update (loadedFile, entrypoints)
    ↓
Reactive Components ($effect, $derived)
    ↓
UI Re-render
    ↓
LocalStorage Persistence (Storage.write)
```

### Entrypoint Analysis Flow
```
Load PRG File
    ↓
Auto-add start address as code entrypoint
    ↓
User adds manual entrypoints (optional)
    ↓
DisassemblerWindow $effect detects change
    ↓
enhancedDisassembler.analyze()
    ↓
Follow code flow from entrypoints
    ↓
Mark code/data sections
    ↓
enhancedDisassembler.convertToProgram()
    ↓
Generate labels, look up C64 comments
    ↓
VirtualScroller renders output
```

### Window Lifecycle
```
App.svelte onMount
    ↓
Storage.get_config() (merge defaults + localStorage)
    ↓
config store updated
    ↓
Windows render (if isOpen && loadedFile conditions met)
    ↓
User drags/resizes window
    ↓
updateWindowConfig() called
    ↓
config store updated
    ↓
Storage.write() persists immediately
```

---

## Testing & Debugging

### Common Issues
1. **Window not showing:** Check localStorage, clear if needed
2. **Disassembly looks wrong:** Add entrypoints to guide analysis
3. **Performance issues:** VirtualScroller handles large files, check line height
4. **Comments not showing:** Toggle checkbox, verify c64-mapping.json loaded

### Debug Tips
- Open browser DevTools console
- Check localStorage: `localStorage.getItem('disawsm_config')`
- View stores: Add `console.log($loadedFile)` in components
- Monitor $effect: Add logging in effect blocks

---

**This overview is comprehensive and up-to-date as of January 10, 2026. All Phase 1-4 features are complete and working.**
