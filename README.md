# disawsm

A browser-based 6502 disassembler for Commodore 64 programs.

## What is this?

**disawsm** is a web-based tool that helps you analyze and disassemble Commodore 64 PRG files. It provides a visual interface to inspect binary data, set entry points, and generate annotated assembly code that can be reassembled with your favorite assembler.

Perfect for reverse engineering old C64 programs, understanding how they work, or creating modified versions.

## Features

- **Smart Disassembly** - Flow-based analysis starting from entrypoints to separate code from data
- **Syntax Highlighting** - Color-coded assembly for better readability (opcodes, labels, addresses, immediates)
- **Custom Labels** - Rename auto-generated labels with meaningful names
- **Inline Comments** - Add your own comments to any instruction or data line
- **Project Files** - Save and resume your work with `.dis` project files
- **Monitor View** - Hex editor with PETSCII visualization for inspecting binary data
- **Multiple Export Formats** - Generate assembly compatible with ACME or Kick Assembler
- **Persistent Storage** - Labels and comments saved in localStorage, survive page reloads

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
- enter 'h' or 'help' in the command line for a list of available commands

### 3. Set Entrypoints

**Entrypoints** tell the disassembler where executable code begins:

- Open the **Entrypoints** window from the View menu
- Add the starting address where code execution begins (usually the load address or a known routine)
- Add additional entry points for interrupt handlers, subroutines, or other code sections
- Mark sections as **code** or **data** to control how they're disassembled
- The disassembler will follow code flow from these points to distinguish code from data

**Why use entrypoints?** Without them, the disassembler treats everything as data. They help you define known sections of code or data.

### 4. View the Disassembly

The **Disassembler** window shows the generated assembly code with **syntax highlighting**:

- Code is disassembled starting from your defined entrypoints
- **Labels** are automatically generated for branches and jumps (shown in orange)
- **Opcodes** in white, **immediate values** (#$xx) in cyan, **addresses** ($xxxx) in pink
- Data sections are preserved as byte definitions
- Click on any instruction to add **custom comments** inline
- Press Enter to save comments, Escape to cancel

### 5. Customize Labels

The **Labels** window (View menu) lets you rename auto-generated labels:

- View all labels used in the disassembly
- Click any label to rename it with a custom name
- Custom labels are highlighted in orange
- Press Enter to save, or click the reset button (↺) to restore auto-generated names
- Labels persist across re-disassembly

### 6. Add Comments

Make your disassembly more readable with custom comments:

- Click anywhere in the comment area of any instruction line
- Type your comment and press Enter to save
- Comments work on both code and data lines
- Auto-generated C64 memory map comments (like "$D020 - Border color") can be edited
- All comments persist in localStorage and project files

### 7. Save Your Work

**Save Assembly** (Ctrl+S):
- Exports the disassembled code as an `.asm` file
- Ready to be reassembled with ACME or Kick Assembler

**Save Project** (File menu):
- Saves a `.dis` project file containing:
  - The original binary data
  - All entrypoints (code/data markers)
  - Custom labels you've defined
  - Custom comments
- Resume your analysis work later by loading the project file

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

- [x] Save/load project files (to resume work later)
- [x] Export as ACME format
- [x] Export as Kick Assembler format
- [x] Custom labels and comments
- [x] Syntax highlighting
- [ ] Search functionality (find text/addresses in disassembly)
- [ ] Symbol export for VICE debugger
- [ ] Undo/redo for entrypoints and labels

## Feedback & Contributions

Open to suggestions and contributions!

- Email: ingo [at] awsm [dot] de
- CSDB Profile: [https://csdb.dk/scener/?id=27239](https://csdb.dk/scener/?id=27239)

---

Made with ❤️ for the C64 scene | [www.awsm.de](http://www.awsm.de)
