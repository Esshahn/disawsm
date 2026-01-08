# DisAWSM Project Plan

**Creating a Web-Based 6502 Disassembler**

Version: 1.0
Created: 2026-01-06
Status: Planning Phase

---

## Project Goal

Transform DisAWSM into a fully functional web-based 6502 disassembler where users can:
1. Load PRG files via menu (File > Load PRG)
2. View hex dump of loaded file
3. Disassemble the binary into 6502 assembly code
4. Save the assembly output

---

## Current Status - COMPLETED TASKS

### Phase 0: Understanding & Documentation ✅
- [x] Full codebase exploration
- [x] Python disassembler analysis
- [x] JSON data file review
- [x] PROJECT_OVERVIEW.md created
- [x] PROJECT_PLAN.md created

**Current Position:** We have a working TypeScript/Vite project with:
- Custom window/dialog system
- Python disassembler logic (needs porting)
- Complete 6502 opcode definitions
- C64 memory map
- Basic UI framework

**Missing:** File loading, hex viewer, disassembler integration, output display

---

## Implementation Phases

### Phase 1: File Loading System ✅ COMPLETED
**Goal:** Enable users to load PRG files into the application

#### Tasks:
1. ✅ **Add File menu to menubar**
   - Location: [index.html:29-37](index.html#L29-L37)
   - Added "File" dropdown with menu items:
     - "Load PRG..." (Ctrl+O)
     - "Save Assembly..." (Ctrl+S) - disabled initially
     - "Clear" - reset application

2. ✅ **Create FileLoader utility class**
   - Created: [src/js/FileLoader.ts](src/js/FileLoader.ts)
   - Implements HTML5 File API
   - Methods:
     - `selectAndLoadPRG()` - Open file picker and load file
     - `readPRG(file)` - Read PRG file format
     - `extractStartAddress(bytes)` - Parse first 2 bytes (little-endian)
     - `validatePRG(file)` - Check file validity (max 64KB)
   - Returns: `LoadedPRG {name, startAddress, bytes}`

3. ✅ **Wire up File menu handlers**
   - Location: [App.ts:143-155](src/js/App.ts#L143-L155)
   - Added click handlers for all File menu items
   - Integrated FileLoader with app state
   - Status bar updates on file load

4. ✅ **Add file state to App.ts**
   - Properties added:
     - `fileLoader: FileLoader` - File loading utility
     - `loadedFile: LoadedPRG | null` - Currently loaded file
     - `assemblyOutput: string | null` - Generated assembly code
   - Methods added:
     - `handleLoadPRG()` - Load PRG file handler
     - `handleSaveAssembly()` - Save assembly (stub for Phase 5)
     - `handleClear()` - Clear loaded file
     - `updateMenuState()` - Enable/disable menu items
     - `setStatus()` - Update status bar

5. ✅ **Update Editor.ts**
   - Added `displayLoadedFile()` method - Shows file info and preview
   - Added `clear()` method - Reset editor display
   - Shows first 16 bytes as hex preview

6. ✅ **Add CSS for disabled menu items**
   - Location: [public/css/stylesheet.css:1096-1100](public/css/stylesheet.css#L1096-L1100)
   - Grayed out disabled items
   - Disabled pointer events

**Deliverable:** ✅ Users can click "File > Load PRG" and load .prg files
**Status:** Build successful, ready for Phase 2

**Files Created:**
- [src/js/FileLoader.ts](src/js/FileLoader.ts) - File loading utility

**Files Modified:**
- [index.html](index.html) - Added File menu
- [src/js/App.ts](src/js/App.ts) - File handlers and state management
- [src/js/Editor.ts](src/js/Editor.ts) - Display loaded files
- [public/css/stylesheet.css](public/css/stylesheet.css) - Disabled menu styling

---

### Phase 2: Hex Viewer Display
**Goal:** Display loaded PRG file as formatted hex dump

#### Tasks:
1. **Create HexViewer component**
   - New file: `src/js/HexViewer.ts`
   - Similar to [Editor.ts](src/js/Editor.ts) structure
   - Methods:
     - `displayHex(startAddr, bytes)` - Main display logic
     - `formatHexLine(addr, bytes)` - Format one line of hex
     - `toASCII(byte)` - Convert byte to printable char
     - `clear()` - Clear display

2. **Implement hex formatting**
   - Format per user requirements:
     ```
     e5cf:  85 cc 8d 92  02 f0 f7 78  a5 cf f0 0c  a5 ce ae 87   .�...��x���.�ή.
     ```
   - 16 bytes per line
   - Grouped by 4 bytes (space separator)
   - Address prefix (4 hex digits + colon)
   - ASCII representation (non-printable = '.')

3. **Update Editor.ts or create new window**
   - **Option A:** Replace Editor placeholder with HexViewer
   - **Option B:** Create separate "Hex Dump" window
   - **Recommendation:** Use Editor window with tabs for Hex/Assembly views

4. **Add monospace styling**
   - Update [stylesheet.css](public/css/stylesheet.css)
   - Add `.hex-viewer` class
   - Use monospace font (e.g., 'Courier New', Consolas)
   - Proper spacing for alignment

5. **Wire up to file loading**
   - When file loads, call `hexViewer.displayHex()`
   - Update status bar with file info

**Deliverable:** Loaded PRG files display as formatted hex dump

**Example Output:**
```
1000:  a9 93 20 d2  ff a2 00 bd  18 10 f0 06  20 d2 ff e8   �. ��..�.��. ��
1010:  4c 08 10 60  48 45 4c 4c  4f 20 57 4f  52 4c 44 00   L..`HELLO WORLD.
```

---

### Phase 3: Port Python Disassembler to TypeScript
**Goal:** Convert [disass.py](disass.py) logic to TypeScript

#### Tasks:
1. **Create Disassembler class**
   - New file: `src/js/Disassembler.ts`
   - Load JSON data files ([opcodes.json](src/json/opcodes.json), [c64-mapping.json](src/json/c64-mapping.json))
   - Main methods matching Python:
     - `analyze(startAddr, bytes, entrypoints)` → ByteArray
     - `convertToProgram(byteArray, opcodes, mapping)` → string
     - `generateByteArray(startAddr, bytes)` → ByteArray

2. **Port utility functions**
   - From [disass.py:51-98](disass.py#L51-L98):
     - `numberToHexByte(n)` - Convert to 2-digit hex
     - `numberToHexWord(n)` - Convert to 4-digit hex
     - `bytesToAddr(hh, ll)` - Combine bytes to address
     - `getAbsFromRelative(byte, addr)` - Relative branch calc
     - `addrInProgram(addr, start, end)` - Range check
     - `getInstructionLength(opcode)` - Opcode length

3. **Implement analysis algorithm**
   - Port [disass.py:236-343](disass.py#L236-L343):
     - Generate byte array with metadata
     - Apply entrypoints
     - Code flow analysis:
       - Track code/data state
       - Follow JMP/JSR/branch instructions
       - Mark jump destinations
       - Default to data after RTS/RTI/JMP

4. **Implement assembly generation**
   - Port [disass.py:100-199](disass.py#L100-L199):
     - Generate labels (`lXXXX` format)
     - Format instructions
     - Add comments from C64 mapping
     - Group data bytes with `!byte` directive
     - Proper spacing and alignment

5. **Load JSON data files**
   - Import in [Disassembler.ts](src/js/Disassembler.ts):
     ```typescript
     import opcodes from '../json/opcodes.json';
     import c64Mapping from '../json/c64-mapping.json';
     ```
   - Ensure Vite config supports JSON imports

6. **Create TypeScript types**
   - New file: `src/js/types.ts`
   - Define interfaces:
     ```typescript
     interface ByteEntry {
       addr: number;
       byte: string;
       dest: number;
       code: number;
       data: number;
     }

     interface Opcode {
       ins: string;
       ill?: number;
       rel?: boolean;
     }

     interface Entrypoint {
       addr: string;
       mode: 'code' | 'data';
     }
     ```

**Deliverable:** Disassembler class that converts byte arrays to assembly

**Testing Strategy:**
- Use known PRG files
- Compare output with Python version
- Verify label generation
- Check code/data detection

---

### Phase 4: Assembly Viewer
**Goal:** Display disassembled output in a readable format

#### Tasks:
1. **Create AssemblyViewer component**
   - New file: `src/js/AssemblyViewer.ts`
   - Methods:
     - `displayAssembly(asmText)` - Show assembly code
     - `clear()` - Clear display
     - `setReadOnly(bool)` - Toggle editing
   - Syntax highlighting (optional, nice-to-have):
     - Labels in one color
     - Instructions in another
     - Comments in gray

2. **Add tabbed interface to Editor**
   - Update [Editor.ts](src/js/Editor.ts)
   - Two tabs: "Hex Dump" and "Assembly"
   - Tab switching logic
   - Show appropriate view based on active tab

3. **Wire up disassembly trigger**
   - Button: "Disassemble" (or auto-trigger on load)
   - Call `disassembler.analyze()` and `disassembler.convertToProgram()`
   - Display result in AssemblyViewer
   - Enable "Save Assembly" menu item

4. **Add assembly styling**
   - Update [stylesheet.css](public/css/stylesheet.css)
   - Monospace font
   - Proper indentation
   - Optional: syntax highlighting colors

**Deliverable:** Users can view disassembled 6502 assembly code

**Example Output:**
```asm
; converted with DisAWSM - 6502 disassembler

* = $1000

            lda #$93           ; clear screen
            jsr $ffd2          ; CHROUT
            ldx #$00

l1008       lda l1018,x
            beq l1016
            jsr $ffd2          ; CHROUT
            inx
            jmp l1008

l1016       rts

l1018       !byte $48, $45, $4c, $4c, $4f
```

---

### Phase 5: Save Assembly Output
**Goal:** Enable users to download generated assembly code

#### Tasks:
1. **Create FileSaver utility**
   - New file: `src/js/FileSaver.ts` (or add to FileLoader)
   - Method: `saveTextFile(filename, content)`
   - Use Blob and download link technique:
     ```typescript
     const blob = new Blob([content], {type: 'text/plain'});
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = filename;
     a.click();
     URL.revokeObjectURL(url);
     ```

2. **Wire up "Save Assembly" menu**
   - Enable menu item after disassembly
   - Click handler in [App.ts](src/js/App.ts)
   - Default filename: `{original}.asm`
   - Prompt for filename (optional)

3. **Add save status feedback**
   - Update status bar: "Assembly saved as filename.asm"
   - Visual confirmation

**Deliverable:** Users can download .asm files

---

### Phase 6: Enhanced Features (v2.0)
**Goal:** Improve functionality and user experience

#### Optional Tasks (prioritized):
1. **Entrypoints Editor**
   - GUI for adding/editing entrypoints
   - Override automatic code/data detection
   - Save custom entrypoints to localStorage
   - Export/import entrypoints.json

2. **Settings Dialog**
   - Toggle C64 comments on/off
   - Choose label prefix (default: 'l')
   - Assembly syntax options (ACME, KickAss, CA65)
   - Hex viewer options (bytes per line)

3. **Dual-pane view**
   - Split Editor window
   - Hex dump on left, assembly on right
   - Synchronized scrolling
   - Click hex byte to highlight instruction

4. **Search functionality**
   - Search hex bytes
   - Search assembly mnemonics
   - Find address
   - Jump to address

5. **Export formats**
   - Plain text (.asm)
   - HTML (with syntax highlighting)
   - PDF (via print)

6. **Drag-and-drop file loading**
   - Drop PRG file anywhere
   - Visual feedback on drag over

7. **Recent files list**
   - Store in localStorage
   - Quick reload

8. **Keyboard shortcuts**
   - Ctrl+O: Load file
   - Ctrl+S: Save assembly
   - Ctrl+D: Disassemble
   - Ctrl+H: Toggle hex/assembly view

9. **Error handling**
   - Invalid PRG format
   - File too large
   - Disassembly errors
   - User-friendly error messages

10. **Performance optimization**
    - Lazy rendering for large files
    - Virtual scrolling
    - Web Worker for disassembly

---

## Technical Decisions

### TypeScript Port Strategy
**Decision:** Port Python logic directly, keeping same algorithm
**Rationale:** Proven algorithm, easier to debug, maintain consistency

### UI Layout
**Decision:** Single Editor window with tabs (Hex/Assembly)
**Rationale:** Less screen clutter, familiar UX pattern, easier state management

### File Handling
**Decision:** Client-side only (no server)
**Rationale:** Privacy, speed, offline capability, simpler deployment

### Storage Strategy
**Decision:** Use localStorage for entrypoints and settings only
**Rationale:** PRG files can be large, don't persist binary data

### JSON Data
**Decision:** Import JSON files directly in TypeScript
**Rationale:** Vite supports JSON imports, no fetch needed, type safety

---

## File Creation Checklist

### New Files Needed:
- [x] `src/js/FileLoader.ts` - File upload handling ✅
- [ ] `src/js/HexViewer.ts` - Hex dump display
- [ ] `src/js/Disassembler.ts` - Core disassembly logic
- [ ] `src/js/AssemblyViewer.ts` - Assembly display
- [ ] `src/js/FileSaver.ts` - File download
- [ ] `src/js/types.ts` - TypeScript interfaces

### Files to Modify:
- [x] `index.html` - Add File menu ✅
- [x] `src/js/App.ts` - File handlers, state management ✅
- [ ] `src/js/Editor.ts` - Tabs, integrate viewers (basic done, hex viewer pending)
- [x] `public/css/stylesheet.css` - Hex/assembly styling (disabled menu done) ✅
- [ ] `src/js/config.ts` - Add new config options
- [ ] `vite.config.js` - Ensure JSON import support

### Files to Reference (no changes):
- `disass.py` - Source of truth for algorithm
- `src/json/opcodes.json` - Opcode definitions
- `src/json/c64-mapping.json` - Memory comments
- `src/json/entrypoints.json` - Example entrypoints

---

## Testing Plan

### Unit Tests (Future)
1. Hex formatting functions
2. Byte conversion utilities
3. Opcode lookup
4. Address calculations
5. Code/data detection

### Integration Tests
1. Load sample PRG file
2. Verify hex dump format
3. Run disassembly
4. Compare with Python output
5. Save assembly file

### Sample Files
Create test suite:
- `test/simple.prg` - Basic "Hello World"
- `test/branches.prg` - Test branch instructions
- `test/data.prg` - Mixed code/data
- `test/jumps.prg` - JMP/JSR heavy

---

## Deployment Checklist

### Before v1.0 Release:
- [ ] All Phase 1-5 tasks complete
- [ ] Tested with multiple PRG files
- [ ] Error handling in place
- [ ] README updated with usage instructions
- [ ] GitHub repo description updated
- [ ] Screenshot/demo GIF added
- [ ] Production build tested (`npm run build`)

### Optional Pre-Release:
- [ ] Add example PRG files
- [ ] Create tutorial/walkthrough
- [ ] Add keyboard shortcut reference
- [ ] Performance testing with large files

---

## Current Session Progress Tracker

### Session: 2026-01-06

**Completed:**
- [x] Phase 0: Full codebase understanding
- [x] Phase 0: Documentation created (PROJECT_OVERVIEW.md, PROJECT_PLAN.md)
- [x] Phase 1: File Loading System ✅ COMPLETE
  - [x] File menu added to HTML
  - [x] FileLoader.ts created and working
  - [x] App.ts updated with file handlers and state
  - [x] Editor.ts updated to display loaded files
  - [x] CSS styling for disabled menus
  - [x] Build successful
- [x] **SVELTE MIGRATION** ✅ COMPLETE
  - [x] Architectural decision documented (ARCHITECTURE_DECISION.md)
  - [x] Svelte + Vite + TypeScript configured
  - [x] Svelte stores created for state management
  - [x] All components ported to Svelte:
    - [x] App.svelte (main component)
    - [x] MenuBar.svelte
    - [x] EditorWindow.svelte
    - [x] StatusBar.svelte
    - [x] About.svelte
  - [x] Build successful (37.28 KB - only +17KB from vanilla)
  - [x] All Phase 1 functionality preserved

**Next Actions (when ready to proceed):**
1. Start Phase 2: Hex Viewer Display
2. Create HexViewer.svelte component
3. Implement hex formatting per user requirements

**Where We Left Off:**
- **Svelte migration complete!**
- All Phase 1 functionality working in Svelte
- Build successful, bundle size acceptable
- Automatic state management now in place
- Ready to implement hex viewer in Phase 2 (will be much easier now!)
- example.prg available in root for testing

**Quick Resume:**
> "Successfully migrated from class-based vanilla TypeScript to Svelte! All Phase 1 functionality (file loading) now works with reactive state management. Build size: 37KB (+17KB for Svelte). Next step: Phase 2 - Create HexViewer.svelte component to display files in hex dump format. The reactive state will make this much cleaner than the old approach."

---

## Notes for Future Claude Sessions

### Quick Context Recovery:
1. Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) first (complete codebase summary)
2. Read this file (PROJECT_PLAN.md) for implementation roadmap
3. Check tasks marked with [ ] in each phase
4. Look at "Current Session Progress Tracker" section above
5. Update this file as tasks complete

### Key Files Reference:
- [disass.py](disass.py) - Algorithm to port
- [App.ts](src/js/App.ts) - Main app controller
- [Editor.ts](src/js/Editor.ts) - Main window (currently placeholder)
- [opcodes.json](src/json/opcodes.json) - 6502 instruction set

### Common Commands:
```bash
npm run dev          # Start dev server
npm run build        # Production build
python disass.py -i file.prg -o file.asm  # Test Python version
```

---

**End of Project Plan**
