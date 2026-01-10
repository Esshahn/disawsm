# disawsm

A browser-based 6502 disassembler for Commodore 64 programs.

## What is this?

**disawsm** is a web-based tool that helps you analyze and disassemble Commodore 64 PRG files. It provides a visual interface to inspect binary data, set entry points, and generate annotated assembly code that can be reassembled with your favorite assembler.

Perfect for reverse engineering old C64 programs, understanding how they work, or creating modified versions.

## Basic Usage

### 1. Load a PRG File

- Click **File → Load PRG** (or press `Ctrl+O`)
- Select a Commodore 64 PRG file from your computer
- The file will be loaded and displayed in the Monitor window

### 2. Inspect the Binary (Monitor)

The **Monitor** window shows a hexadecimal view of your loaded binary:

- Browse through the memory contents
- Identify code sections vs data sections
- Look for patterns, strings, or known data structures
- Click on any address to jump to that location in the disassembler

### 3. Set Entrypoints

**Entrypoints** tell the disassembler where executable code begins:

- Open the **Entrypoints** window from the View menu
- Add the starting address where code execution begins (usually the load address or a known routine)
- Add additional entry points for interrupt handlers, subroutines, or other code sections
- The disassembler will follow code flow from these points to distinguish code from data

**Why use entrypoints?** Without them, the disassembler treats everything as code, which produces incorrect results when it encounters data tables, text strings, or graphics. Entrypoints help the tool understand the program structure.

### 4. View the Disassembly

The **Disassembler** window shows the generated assembly code:

- Code is disassembled starting from your defined entrypoints
- Labels are automatically generated for branches and jumps
- Data sections are preserved as byte definitions
- Navigate by clicking addresses or using jump commands

### 5. Save the Assembly

- Click **File → Save Assembly** (or press `Ctrl+S`)
- The disassembled code is saved as an `.asm` file
- This file can be edited and reassembled with assemblers like ACME or Kick Assembler

## Tech Stack

Built with modern web technologies:

- **Svelte 5** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool and dev server

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Todo

- [ ] Save/load project files (to resume work later)
- [ ] Export as ACME format
- [ ] Export as Kick Assembler format

## Feedback & Contributions

Open to suggestions and contributions!

- Email: ingo [at] awsm [dot] de
- CSDB Profile: [https://csdb.dk/scener/?id=27239](https://csdb.dk/scener/?id=27239)

---

Made with ❤️ for the C64 scene | [www.awsm.de](http://www.awsm.de)
