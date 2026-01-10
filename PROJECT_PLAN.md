# DisAWSM Project Plan



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
