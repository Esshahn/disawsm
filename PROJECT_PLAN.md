# DisAWSM Project Plan

**Creating a Web-Based 6502 Disassembler**

Version: 2.0
Created: 2026-01-06
Updated: 2026-01-08
Status: **Phase 2 Complete - Ready for Phase 3**

---

## Project Goal

Transform DisAWSM into a fully functional web-based 6502 disassembler where users can:
1. ✅ Load PRG files via menu (File > Load PRG)
2. ✅ View hex dump of loaded file
3. ⏳ Disassemble the binary into 6502 assembly code **(NEXT)**
4. ⏳ Save the assembly output

---

## Technology Stack

- **Svelte 5.46.1** - Modern reactive framework with runes
- **TypeScript** - Type-safe development
- **Vite 7.3.0** - Fast build tool
- **Bundle size:** 46.31 KB (gzipped: 17.41 KB)

---

## Phase 0: Understanding & Documentation ✅ COMPLETE

### Tasks Completed:
- [x] Full codebase exploration
- [x] Python disassembler analysis
- [x] JSON data file review
- [x] PROJECT_OVERVIEW.md created
- [x] PROJECT_PLAN.md created
- [x] **Svelte 5 migration decision made**
- [x] **Architecture refactoring to `lib/` structure**

**Outcome:** Clean, modern Svelte 5 codebase with proper structure

---

## Phase 1: File Loading System ✅ COMPLETE

**Goal:** Enable users to load PRG files into the application

### Tasks Completed:

#### 1. ✅ Migrated to Svelte 5
- Converted all components to Svelte 5 runes (`$state`, `$props`, `$derived`)
- Removed class-based architecture
- Created Svelte stores for global state
- Configured `mount()` API instead of `new App()`

#### 2. ✅ Refactored to Modern Structure
- Created `src/lib/` folder structure:
  - `components/` - UI, dialogs, editor components
  - `services/` - Business logic (fileLoader, storage)
  - `stores/` - Global state management
  - `utils/` - Pure utility functions
  - `types/` - TypeScript interfaces
  - `config/` - App configuration
- Configured `$lib` path alias in tsconfig.json and vite.config.js

#### 3. ✅ Implemented File Menu
- Location: [src/lib/components/ui/MenuBar.svelte](src/lib/components/ui/MenuBar.svelte)
- Added "File" dropdown with:
  - "Load PRG..." (Ctrl+O)
  - "Save Assembly..." (Ctrl+S) - disabled until assembly generated
  - "Clear" - reset application

#### 4. ✅ Created FileLoader Service
- Location: [src/lib/services/fileLoader.ts](src/lib/services/fileLoader.ts)
- Implements HTML5 File API
- Methods:
  - `selectAndLoadPRG()` - Open file picker and load file
  - `readPRG(file)` - Read PRG file format
  - `extractStartAddress(bytes)` - Parse first 2 bytes (little-endian)
  - `validatePRG(file)` - Check file validity (max 64KB)
- Returns: `LoadedPRG {name, startAddress, bytes}`

#### 5. ✅ Created Reactive State Management
- Location: [src/lib/stores/app.ts](src/lib/stores/app.ts)
- Stores:
  - `loadedFile` - writable store for loaded PRG
  - `assemblyOutput` - writable store for disassembled code
  - `status` - derived store for status bar
  - `saveDisabled` - derived store for menu state
  - `config` - app configuration

#### 6. ✅ Integrated File Handlers in App.svelte
- Location: [src/App.svelte](src/App.svelte)
- Handlers:
  - `handleLoadPRG()` - Load PRG file
  - `handleSaveAssembly()` - Save assembly (stub for Phase 5)
  - `handleClear()` - Clear loaded file

**Deliverable:** ✅ Users can load .prg files, status bar updates with file info

**Files Created:**
- `src/lib/services/fileLoader.ts`
- `src/lib/stores/app.ts`
- `src/lib/types/index.ts`
- `src/lib/components/ui/MenuBar.svelte`
- `src/lib/components/ui/StatusBar.svelte`
- `src/lib/components/ui/Window.svelte`
- `src/lib/components/dialogs/About.svelte`

**Files Modified:**
- `src/App.svelte` - Converted to Svelte 5, added file handlers
- `tsconfig.json` - Added `$lib` path alias
- `vite.config.js` - Added `$lib` path alias
- `svelte.config.js` - Configured for pure Svelte 5

---

## Phase 2: Hex Viewer Display ✅ COMPLETE

**Goal:** Display loaded PRG file as formatted hex dump

### Tasks Completed:

#### 1. ✅ Created HexViewer Component
- Location: [src/lib/components/editor/HexViewer.svelte](src/lib/components/editor/HexViewer.svelte)
- Features:
  - Uses `$props()` for props (bytes, startAddress)
  - Uses `$derived()` for reactive hex line formatting
  - Displays 16 bytes per line
  - Groups bytes by 4 with extra spacing
  - Shows ASCII representation (printable chars or dots)
  - Format: `e5cf:  85 cc 8d 92  02 f0 f7 78  ...  .�...��x`
- Styling:
  - Dark theme matching UI
  - Color-coded: address (green), hex (white), ASCII (gray)
  - Hover highlighting for better readability
  - Scrollable for large files

#### 2. ✅ Created EditorWindow Component
- Location: [src/lib/components/editor/EditorWindow.svelte](src/lib/components/editor/EditorWindow.svelte)
- Uses Window component for draggable container
- Shows file metadata header (name, start/end address, size)
- Integrates HexViewer component
- Displays "No file loaded" message when empty

#### 3. ✅ Integrated into App
- EditorWindow automatically updates when file loaded
- Reactive to `$loadedFile` store changes
- Clean separation: editor displays, stores manage state

**Deliverable:** ✅ Loaded PRG files display as hex dump with ASCII

**Format Example:**
```
File: example.prg
Start: $1000  End: $10ff  Size: 256 bytes

1000:  a9 93 20 d2  ff a2 00 bd  18 10 f0 08  20 d2 ff e8   �. �.�.�...� ��.
1010:  4c 08 10 60  48 45 4c 4c  4f 20 57 4f  52 4c 44 21   L..`HELLO WORLD!
```

**Files Created:**
- `src/lib/components/editor/HexViewer.svelte`
- `src/lib/components/editor/EditorWindow.svelte`

**Files Modified:**
- `src/App.svelte` - Added EditorWindow component

---

## Phase 3: Disassembler Integration ⏳ NEXT PHASE

**Goal:** Convert loaded bytes into 6502 assembly code

### Planned Tasks:

#### 1. ⏳ Create Disassembler Service
- Location: `src/lib/services/disassembler.ts`
- Port Python logic from [disass.py](disass.py) to TypeScript
- Load opcodes from `src/json/opcodes.json`
- Core methods:
  - `loadOpcodes()` - Load opcode definitions
  - `disassemble(bytes, startAddress)` - Main disassembly function
  - `getOpcode(byte)` - Lookup instruction
  - `formatInstruction(opcode, operands)` - Format assembly line

#### 2. ⏳ Implement Opcode Lookup
- Read `opcodes.json` at runtime
- Parse opcode definitions:
  ```json
  {
    "a9": {"ins": "lda #$hh"},
    "ad": {"ins": "lda $hhll"}
  }
  ```
- Replace placeholders (`hh`, `ll`) with actual bytes
- Handle 1, 2, and 3-byte instructions

#### 3. ⏳ Port Code/Data Analysis
- Implement byte array with metadata:
  ```typescript
  {
    addr: number;      // Memory address
    byte: string;      // Hex value
    dest: boolean;     // Is jump/branch target?
    code: boolean;     // Is code?
    data: boolean;     // Is data?
  }
  ```
- Apply entrypoints from `entrypoints.json`
- Follow code flow (JMP/JSR/branches)
- Mark data access targets

#### 4. ⏳ Generate Labels
- Create `lXXXX` labels for jump/branch targets
- Track all destinations
- Generate label map

#### 5. ⏳ Format Assembly Output
- Generate header comment
- Add origin directive (`* = $1000`)
- Format code sections with proper spacing
- Format data sections (`!byte $xx, $xx`)
- Add labels at appropriate lines

#### 6. ⏳ Wire up Disassemble Button
- Add "Disassemble" button to UI
- Trigger disassembly on click
- Store result in `assemblyOutput` store
- Update status bar

**Deliverable:** Users can click "Disassemble" and generate assembly code

**Expected Output:**
```asm
; converted with DisAWSM - 6502 disassembler

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

l1018       !byte $48, $45, $4c, $4c, $4f
```

**Files to Create:**
- `src/lib/services/disassembler.ts`

**Files to Modify:**
- `src/lib/stores/app.ts` - Update with disassembly status
- `src/lib/components/editor/EditorWindow.svelte` - Add disassemble button
- `src/App.svelte` - Add disassemble handler

---

## Phase 4: Assembly Viewer ⏳ PLANNED

**Goal:** Display disassembled assembly code in editor

### Planned Tasks:

#### 1. ⏳ Create AssemblyViewer Component
- Location: `src/lib/components/editor/AssemblyViewer.svelte`
- Display formatted assembly code
- Line numbers
- Syntax highlighting (colors for labels, instructions, operands, comments)
- Scrollable output

#### 2. ⏳ Add Tab/View Switching
- Toggle between Hex View and Assembly View
- Tab interface in EditorWindow
- Preserve both views in memory

#### 3. ⏳ Implement Label Navigation
- Click on labels to jump to definition
- Highlight label references

**Deliverable:** Users can view disassembled code with syntax highlighting

**Files to Create:**
- `src/lib/components/editor/AssemblyViewer.svelte`
- `src/lib/components/editor/TabBar.svelte` (optional)

**Files to Modify:**
- `src/lib/components/editor/EditorWindow.svelte` - Add view switching

---

## Phase 5: File Export ⏳ PLANNED

**Goal:** Save assembly code to file

### Planned Tasks:

#### 1. ⏳ Implement File Download
- Create download utility in `src/lib/utils/download.ts`
- Use Blob API to create file
- Trigger browser download with `<a>` element

#### 2. ⏳ Wire up Save Menu
- Enable "Save Assembly..." menu item when assembly exists
- Add keyboard shortcut (Ctrl+S)
- Default filename: `{original-name}.asm`

#### 3. ⏳ Add Export Options
- Optional: Allow choosing filename
- Optional: Include/exclude comments
- Optional: Export configuration

**Deliverable:** Users can save assembly code as `.asm` file

**Files to Create:**
- `src/lib/utils/download.ts`

**Files to Modify:**
- `src/App.svelte` - Implement `handleSaveAssembly()`
- `src/lib/components/ui/MenuBar.svelte` - Enable save menu item

---

## Phase 6: Advanced Features ⏳ FUTURE

**Goal:** Enhanced disassembly capabilities

### Planned Tasks:

#### 1. ⏳ Entrypoints Editor
- UI for adding/removing entrypoints
- Mark addresses as code or data
- Save entrypoints to localStorage

#### 2. ⏳ C64 Memory Map Integration
- Load `c64-mapping.json`
- Add comments for known C64 addresses (e.g., $d020 = border color)
- Enhance readability

#### 3. ⏳ Interactive Settings
- Toggle illegal opcodes
- Customize label format
- Adjust comment style

#### 4. ⏳ Export to Different Formats
- Kick Assembler format
- ACME format
- CA65 format

**Deliverable:** Professional-grade 6502 disassembler

**Files to Create:**
- `src/lib/components/dialogs/EntrypointsEditor.svelte`
- `src/lib/services/memoryMap.ts`
- `src/lib/components/dialogs/Settings.svelte`

---

## Current Progress Summary

### ✅ Completed:
- **Phase 0:** Documentation and architecture planning
- **Phase 1:** File loading system with Svelte 5
- **Phase 2:** Hex viewer display

### ⏳ Next Up:
- **Phase 3:** Disassembler integration **(START HERE)**

### 📊 Progress: 33% Complete (2 of 6 phases)

---

## Build Status

- **Bundle Size:** 46.31 KB (gzipped: 17.41 KB)
- **Framework:** Pure Svelte 5 (no compatibility mode)
- **Warnings:** Only a11y warnings (cosmetic, low priority)

---

## Key Decisions Made

### Architecture:
- ✅ **Svelte 5 Migration** - Modern reactive framework
- ✅ **Runes-based** - `$state()`, `$props()`, `$derived()`
- ✅ **lib/ Structure** - Organized by feature/type
- ✅ **Path Aliases** - `$lib/...` for clean imports
- ✅ **Stores** - Reactive global state
- ✅ **TypeScript** - Type-safe development

### Removed:
- ❌ Class-based architecture (archived)
- ❌ Vanilla JS approach
- ❌ Manual DOM manipulation
- ❌ `window.app` global anti-pattern

---

## Testing Checklist (Post-Phase 3)

### File Loading:
- [ ] Load small PRG file (< 1KB)
- [ ] Load large PRG file (64KB)
- [ ] Invalid file rejection
- [ ] Status bar updates correctly

### Hex Viewer:
- [x] Displays 16 bytes per line
- [x] Groups bytes by 4
- [x] Shows ASCII representation
- [x] Address column correct
- [x] Scrollable for large files

### Disassembly: (Phase 3)
- [ ] Opcodes lookup correctly
- [ ] Labels generated for jumps
- [ ] Code/data separation works
- [ ] Assembly format matches spec
- [ ] Illegal opcodes handled

### File Export: (Phase 5)
- [ ] Download triggers correctly
- [ ] Filename correct
- [ ] File contents valid assembly
- [ ] Comments included

---

## Known Issues

- None currently (all issues from Svelte 4 migration resolved)

---

## Future Enhancements

- Drag & drop file loading
- Multi-file projects
- Compare disassemblies
- Export to JSON/XML
- Server-side Python disassembler API (optional)

---

## Version History

- **v2.0** (2026-01-08) - Svelte 5 migration, Phases 1-2 complete
- **v1.0** (2026-01-06) - Initial project plan
