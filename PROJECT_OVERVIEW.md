# DisAWSM Project Overview

**Quick Start Guide for Claude Sessions**

Last Updated: 2026-01-06

## Project Summary

DisAWSM is a web-based 6502 disassembler that converts Commodore 64 PRG files (machine code binaries) into annotated assembly code. The project combines a Python-based disassembler engine ([disass.py](disass.py)) with a modern TypeScript web interface.

**Goal:** Create a browser-based application where users can upload PRG files, view hex dumps, and generate disassembled 6502 assembly code.

---

## Technology Stack

### Frontend
- **TypeScript** (ES2017, strict mode)
- **Vite 7.3.0** (build tool with hot reload)
- **Vanilla JS/DOM** (no framework - custom window/dialog system)
- **Native HTML5 `<dialog>` API** for modals
- **LocalStorage** for persistence

### Backend/Logic
- **Python 3** ([disass.py](disass.py) - 418 lines)
  - Standalone 6502 disassembler
  - PRG file parser (first 2 bytes = start address)
  - Code/data analysis and label generation

### Build System
```bash
npm run dev    # Development server (http://localhost:5173)
npm run build  # Production build to dist/
```

---

## Directory Structure

```
/Users/ingohinterding/github/disawsm/
├── index.html                 # Main HTML entry
├── package.json              # NPM config (v1.2.1)
├── tsconfig.json             # TypeScript config
├── vite.config.js            # Vite config
├── disass.py                 # Python disassembler (CLI tool)
│
├── src/
│   ├── js/                   # TypeScript application code
│   │   ├── App.ts           # Main app entry (143 lines)
│   │   ├── Window.ts        # Window/dialog manager
│   │   ├── Dialog.ts        # Custom dialog wrapper
│   │   ├── Editor.ts        # Editor window (currently placeholder)
│   │   ├── About.ts         # About dialog
│   │   ├── Storage.ts       # LocalStorage manager
│   │   ├── helper.ts        # DOM utilities
│   │   └── config.ts        # Default configuration
│   │
│   └── json/                # Data files
│       ├── opcodes.json     # 6502 instruction set (883 lines)
│       ├── c64-mapping.json # C64 memory map (172 lines)
│       └── entrypoints.json # Disassembly hints (5 lines)
│
└── public/
    ├── css/
    │   └── stylesheet.css   # Main CSS (1,686 lines)
    └── ui/
        ├── logo.svg         # Logo
        └── bg_glossy.png    # Background texture
```

---

## Key Components

### 1. App.ts ([src/js/App.ts:14-143](src/js/App.ts#L14-L143))
Main application controller:
- Initializes Storage, Windows, and Editor
- Manages keyboard shortcuts
- Stores window positions to localStorage
- Creates global `window.app` reference
- Currently creates two windows: Editor and About

### 2. Window.ts
Custom window management system:
- Wraps HTML5 `<dialog>` elements
- Draggable and resizable windows
- Z-index stacking management
- Modal and non-modal support
- Position/resize callbacks for persistence

### 3. Editor.ts ([src/js/Editor.ts:3-17](src/js/Editor.ts#L3-L17))
**Current state:** Placeholder with "Hello World"
**Future state:** Main disassembly viewer/editor

### 4. Storage.ts
LocalStorage wrapper:
- Version comparison system (`YY.MM.DD.patch`)
- Config persistence
- Auto-save functionality

### 5. disass.py ([disass.py:1-419](disass.py#L1-L419))
Python disassembler engine:
- **load_file()** - Reads PRG files, extracts start address
- **analyze()** - Distinguishes code from data
- **convert_to_program()** - Generates assembly output

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

## Current Menu System

From [index.html:20-43](index.html#L20-L43):

### DisAWSM
- About (opens About dialog)

### View
- Toggle Fullscreen (Ctrl+F)

### Help
- README on github
- www.awsm.de

**Note:** No File menu yet for loading PRG files!

---

## UI Architecture

### Window System
- Based on HTML5 `<dialog>` elements
- Custom dragging/resizing logic
- Z-index management (starts at 100)
- Position persistence via localStorage

### Styling
- Dark theme with custom colors
- CSS variables in [public/css/stylesheet.css](public/css/stylesheet.css)
- Dotted background pattern
- Quicksand font family

### Current Windows
1. **Editor** (window_editor) - Main window, non-closeable
2. **About** (window_about) - Modal, auto-opens on version update

---

## Storage & Configuration

### config.ts ([src/js/config.ts](src/js/config.ts))
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

### Storage.ts ([src/js/Storage.ts](src/js/Storage.ts))
- Merges defaults with localStorage
- Version comparison for updates
- Auto-save functionality
- Separate storage for work data

---

## Next Steps (From Current State)

The project has:
- ✅ Working window/dialog system
- ✅ Python disassembler engine
- ✅ JSON data files (opcodes, C64 map)
- ✅ Basic UI framework
- ✅ Configuration/storage system

Missing:
- ❌ File upload/loading mechanism
- ❌ Hex viewer display
- ❌ Integration of Python logic into TypeScript
- ❌ Assembly output viewer
- ❌ File download/save functionality

---

## Hex Dump Format (Target)

Example from user requirements:
```
e5cf:  85 cc 8d 92  02 f0 f7 78  a5 cf f0 0c  a5 ce ae 87   .�...��x���.�ή.
e5df:  02 a0 00 84  cf 20 13 ea  20 b4 e5 c9  83 d0 10 a2   .�..� .� ���.�.�
e5ef:  09 78 86 c6  bd e6 ec 9d  76 02 ca d0  f7 f0 cf c9   .x.ƽ��.v.������
```

Format breakdown:
- `e5cf:` - Address in hex (4 digits)
- `85 cc ... 87` - 16 bytes in hex (grouped by 4)
- `.�...��x...` - ASCII representation (non-printable = .)

---

## Important Notes

### Code Style
- TypeScript strict mode enabled
- No framework dependencies (vanilla DOM)
- Class-based architecture
- Helper utilities in [helper.ts](src/js/helper.ts)

### Python Integration Strategy
The Python code in [disass.py](disass.py) needs to be ported to TypeScript:
- File parsing logic
- Opcode lookup
- Code/data analysis algorithm
- Label generation
- Assembly formatting

### Browser Constraints
- No access to filesystem (use File API)
- All processing must be client-side
- LocalStorage for persistence

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
1. [App.ts](src/js/App.ts) - Application entry point
2. [Editor.ts](src/js/Editor.ts) - Main editing area (currently empty)
3. [disass.py](disass.py) - Disassembly logic to port
4. [opcodes.json](src/json/opcodes.json) - Instruction definitions
5. [Window.ts](src/js/Window.ts) - Dialog/window management

---

## Version History

- v26.01.04 - Current version
- Storage system tracks version updates
- About dialog auto-opens on new versions
