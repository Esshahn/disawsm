# Enhanced Disassembler Documentation

## Overview

The Enhanced Disassembler ([enhancedDisassembler.ts](src/lib/services/enhancedDisassembler.ts)) is a 6502 machine code disassembler that converts raw bytes into assembly language. It implements a sophisticated analysis algorithm to distinguish between code and data sections, based on the logic from the original `disass.py` implementation.

## Core Architecture

### Key Data Structures

#### DisassembledByte
```typescript
{
  addr: number;      // absolute address of this byte
  byte: string;      // hex representation of the byte
  dest: boolean;     // is this a jump/branch destination?
  code: boolean;     // is this executable code?
  data: boolean;     // is this data?
}
```

This is the fundamental unit of analysis. Each byte in the input is tagged with metadata that helps determine how it should be disassembled.

#### DisassembledLine
```typescript
{
  address: number;   // starting address of this line
  label?: string;    // optional label if this is a destination
  instruction: string; // the assembly instruction or .byte directive
  comment?: string;  // optional comment (e.g., C64 memory map info)
  bytes: number[];   // the raw bytes that make up this instruction
  isData?: boolean;  // true if this is a .byte directive
}
```

Represents a single line of assembly output.

## The analyze() Function - Core Algorithm

The `analyze()` function at [enhancedDisassembler.ts:146-261](src/lib/services/enhancedDisassembler.ts#L146-L261) is the heart of the disassembler. It determines which bytes are code and which are data.

### Phase 1: Initialization (Lines 151-152)

```typescript
const bytesTable = generateByteArray(startAddr, bytes);
```

Creates an array of `DisassembledByte` objects, one for each input byte. Initially:
- All bytes have `dest = false`, `code = false`, `data = false`
- They're just raw bytes waiting to be classified

### Phase 2: Opcode Classifications (Lines 154-177)

The algorithm uses three categories of opcodes to guide its analysis:

**1. defaultToDataAfter** (Line 154)
- Opcodes: `JMP ($4C)`, `RTS ($60)`, `RTI ($40)`
- These instructions terminate code flow
- After encountering these, the algorithm assumes data follows (unless proven otherwise by an entrypoint)

**2. absBranchMnemonics** (Line 157)
- Opcodes: `JMP ($4C)`, `JSR ($20)`
- These instructions with absolute addresses point to code locations
- Their target addresses are marked as code destinations

**3. absAddressMnemonics** (Lines 160-177)
- Instructions like `LDA`, `STA`, `ADC`, `AND`, etc. with absolute addressing
- These access memory locations that are likely data
- Their target addresses are marked as data destinations

### Phase 3: Entrypoint Processing (Lines 184-199)

```typescript
if (entrypoints && entrypoints.length > 0) {
  for (const entrypoint of entrypoints) {
    // Mark entrypoint as destination
    bytesTable[tablePos].dest = true;

    // Set code or data based on entrypoint type
    if (entrypoint.type === 'code') {
      bytesTable[tablePos].code = true;
      bytesTable[tablePos].data = false;
    } else {
      bytesTable[tablePos].data = true;
      bytesTable[tablePos].code = false;
    }
  }
}
```

**Critical**: Entrypoints are user-defined "hints" that mark specific addresses as code or data. This is the seed that starts the analysis:
- A code entrypoint marks that address and everything reachable from it as code
- A data entrypoint marks that address as data
- Without entrypoints, the algorithm starts in "data mode" (see Phase 4)

### Phase 4: Main Analysis Loop (Lines 201-258)

This is a state machine that walks through the byte array:

```typescript
let isCode = false;  // Currently processing code?
let isData = true;   // Currently processing data?
```

**Key Insight**: The algorithm starts assuming everything is data (`isData = true`). It needs explicit proof (entrypoints or branch targets) to classify bytes as code.

#### State Transitions

**Entering Code Mode** (Lines 215-217)
```typescript
if (bytesTable[i].code) {
  isCode = true;
}
```
When encountering a byte previously marked as code (by an entrypoint or branch target), switch to code mode.

**Entering Data Mode** (Lines 211-213)
```typescript
if (bytesTable[i].data) {
  isData = true;
}
```
When encountering a byte marked as data, switch to data mode.

**Exiting Code Mode** (Lines 224-226)
```typescript
if (defaultToDataAfter.includes(byte)) {
  isCode = false;  // Back to data mode
}
```
After `JMP`, `RTS`, or `RTI`, code flow terminates, so revert to data mode.

#### Code Analysis Logic (Lines 219-255)

When in code mode (`isCode = true`):

1. **Mark current byte as code** (Line 220)
   ```typescript
   bytesTable[i].code = true;
   ```

2. **Calculate instruction length** (Line 222)
   - Based on the opcode's instruction template
   - Templates contain `hh` (high byte) and/or `ll` (low byte) placeholders
   - 1 byte: implied/accumulator (e.g., `INX`, `RTS`)
   - 2 bytes: immediate/zeropage/relative (e.g., `LDA #$05`, `BNE`)
   - 3 bytes: absolute addressing (e.g., `JSR $1000`)

3. **Handle relative branches** (Lines 230-232)
   ```typescript
   if ('rel' in opcode && i + 1 < end) {
     destinationAddress = getAbsFromRelative(bytesTable[i + 1].byte, startAddr + i + 1);
   }
   ```
   - Branch instructions (`BEQ`, `BNE`, `BCC`, etc.) use relative addressing
   - The byte after the opcode is a signed offset (-128 to +127)
   - Convert to absolute address by adding/subtracting from current PC

4. **Handle absolute addresses** (Lines 234-236)
   ```typescript
   if (instructionLength === 2 && i + 2 < end) {
     destinationAddress = bytesToAddr(bytesTable[i + 2].byte, bytesTable[i + 1].byte);
   }
   ```
   - Three-byte instructions store address as little-endian (low byte, high byte)
   - Combine to get the full 16-bit address

5. **Mark branch/jump targets as code** (Lines 238-244)
   ```typescript
   if (absBranchMnemonics.includes(byte) || 'rel' in opcode) {
     if (addrInProgram(destinationAddress, startAddr, startAddr + end)) {
       bytesTable[tablePos].code = true;  // Propagate code marking
       bytesTable[tablePos].dest = true;   // Mark as branch destination
     }
   }
   ```
   **Critical propagation**: When code branches to an address, that address becomes a new code entrypoint. This is how code sections grow during analysis.

6. **Mark data access targets as data** (Lines 246-252)
   ```typescript
   if (absAddressMnemonics.includes(byte)) {
     if (addrInProgram(destinationAddress, startAddr, startAddr + end)) {
       bytesTable[tablePos].data = true;  // Mark as data
       bytesTable[tablePos].dest = true;   // Mark as data destination
     }
   }
   ```
   When code loads/stores from an absolute address, that address is likely data.

7. **Skip instruction bytes** (Line 254)
   ```typescript
   i += instructionLength;
   ```
   After processing the opcode, skip over its operand bytes (they're not separate instructions).

8. **Always increment** (Line 257)
   ```typescript
   i++;
   ```
   Move to the next byte.

## Assumptions and Heuristics

### What is Code?

A byte is considered code if:
1. **Explicitly marked** by a code entrypoint
2. **Reachable** from code via `JMP`, `JSR`, or branch instructions
3. **Sequential** - bytes following code (until hitting `JMP`/`RTS`/`RTI`)

### What is Data?

A byte is considered data if:
1. **Explicitly marked** by a data entrypoint
2. **Referenced** by load/store instructions from code
3. **Default assumption** - anything not proven to be code

### Conflicts and Edge Cases

**What if a byte is marked both code and data?**
- The analysis loop checks `bytesTable[i].data` first (line 211)
- Then checks `bytesTable[i].code` (line 215)
- Both `isData` and `isCode` can be true simultaneously
- In `convertToProgram()`, the check is `if (!byteData.code || byteData.data)` (line 332)
- **Result**: Data takes precedence - if marked as data, it's treated as data

**Self-modifying code**
- Not handled - the algorithm assumes code doesn't modify itself
- If code stores to its own address space, that location might be incorrectly marked as data

**Indirect jumps** (`JMP ($xxxx)`)
- Cannot statically analyze the destination
- The target won't be marked as code unless there's an entrypoint

**Tables and data embedded in code**
- Data tables between code sections may be misclassified as code
- Requires manual data entrypoints to correct

## convertToProgram() Function

This function ([enhancedDisassembler.ts:315-406](src/lib/services/enhancedDisassembler.ts#L315-L406)) converts the analyzed byte array into assembly lines.

### Data Lines (Lines 332-336)

```typescript
if (!byteData.code || byteData.data) {
  const { line, nextIndex } = createDataLine(byteArray, i, label, end, pseudoOpcodePrefix);
  program.push(line);
  i = nextIndex;
  continue;
}
```

Creates `.byte` directives for data sections. Groups consecutive data bytes (up to 8 per line) for readability.

### Code Lines (Lines 340-400)

Reconstructs the assembly instruction:

1. **One-byte instructions** (Lines 356-367)
   - Implied mode (e.g., `RTS`) - no operands
   - Immediate mode (e.g., `LDA #$05`) - one operand byte
   - Relative branches - convert offset to label

2. **Two-byte instructions** (Lines 370-384)
   - Absolute addressing (e.g., `JSR $1000`)
   - If target is within program, replace address with label
   - If target is external, keep as `$xxxx`

3. **Labels** (Line 329)
   ```typescript
   const label = byteData.dest ? labelPrefix + numberToHexWord(byteData.addr) : undefined;
   ```
   Any byte marked as a destination gets a label (e.g., `L1000`).

4. **Comments** (Lines 387-391)
   - If instruction references a known C64 memory location
   - Add comment with the name (e.g., `$D020` gets "; BORDER COLOR")

## Flow Example

Let's trace a small example:

**Input:**
```
Address: $1000
Bytes: A9 05 8D 20 D0 60
```

**Phase 1 - Initialization:**
```
$1000: A9  dest=F code=F data=F
$1001: 05  dest=F code=F data=F
$1002: 8D  dest=F code=F data=F
$1003: 20  dest=F code=F data=F
$1004: D0  dest=F code=F data=F
$1005: 60  dest=F code=F data=F
```

**Phase 2 - Entrypoint (assume code entrypoint at $1000):**
```
$1000: A9  dest=T code=T data=F  <-- marked by entrypoint
$1001: 05  dest=F code=F data=F
$1002: 8D  dest=F code=F data=F
$1003: 20  dest=F code=F data=F
$1004: D0  dest=F code=F data=F
$1005: 60  dest=F code=F data=F
```

**Phase 3 - Main Loop:**

i=0: `A9` = `LDA #$hh`
- `isCode = true` (byte marked as code)
- Mark `$1000` as code
- Instruction length = 1
- Not a branch/jump
- Skip operand: `i += 1` → i=1
- Increment: `i++` → i=2

i=2: `8D` = `STA $hhll`
- Still in code mode (`isCode = true`)
- Mark `$1002` as code
- Instruction length = 2
- Read address: `$D020` (combining `$20` and `$D0`)
- This is `STA` (in absAddressMnemonics)
- `$D020` is outside program - not marked
- Skip operands: `i += 2` → i=4
- Increment: `i++` → i=5

i=5: `60` = `RTS`
- Still in code mode
- Mark `$1005` as code
- `RTS` is in `defaultToDataAfter`
- Set `isCode = false` (exit code mode)
- Increment: `i++` → i=6
- Loop exits (i >= end)

**Final byte table:**
```
$1000: A9  dest=T code=T data=F
$1001: 05  dest=F code=F data=F  (part of LDA instruction)
$1002: 8D  dest=F code=T data=F
$1003: 20  dest=F code=F data=F  (part of STA instruction)
$1004: D0  dest=F code=F data=F  (part of STA instruction)
$1005: 60  dest=F code=T data=F
```

**Output assembly:**
```
L1000  LDA #$05
       STA $D020  ; BORDER COLOR
       RTS
```

## Critical Design Decisions

### 1. Conservative Code Detection
The algorithm is conservative - it only marks bytes as code when there's explicit evidence (entrypoints or reachable via branches). This prevents misinterpreting data as code.

### 2. Data Preference in Conflicts
When a byte could be both code and data, data wins. This is safer because treating code as data (`.byte` directive) is less harmful than treating data as code (invalid disassembly).

### 3. Sequential Code Following
Once in code mode, the algorithm continues marking bytes as code until hitting a flow terminator (`JMP`/`RTS`/`RTI`). This handles the common case of sequential instructions.

### 4. Propagation Through Branches
Branch and jump targets are immediately marked as code, which causes the analysis to "discover" new code sections recursively.

### 5. Single-Pass with State
The algorithm is single-pass with state (`isCode`/`isData`). It relies on the entrypoint pre-marking phase to seed the analysis correctly. A more sophisticated multi-pass algorithm could improve accuracy.

## Limitations

1. **Requires entrypoints**: Without at least one code entrypoint, everything is treated as data.

2. **Static analysis only**: Cannot handle runtime-determined jumps or self-modifying code.

3. **Heuristic-based**: Load/store instructions marking targets as data is a heuristic that can misclassify.

4. **Single pass**: May miss code sections that are only reachable through indirect jumps or computed addresses.

5. **No dataflow analysis**: Doesn't track register contents or memory values, only opcode patterns.

## Integration Points

The disassembler integrates with:

1. **Entrypoints system** - User provides hints via the entrypoints store
2. **Opcodes database** - JSON file with 6502 instruction definitions
3. **C64 memory map** - JSON file with known memory locations for comments
4. **Syntax system** - Configurable assembler syntax (ACME, KickAss, etc.)
5. **Settings store** - Label prefix and syntax preferences

## Performance Characteristics

- **Time complexity**: O(n) where n is the number of bytes
- **Space complexity**: O(n) for the byte table
- **Single pass**: Very efficient for large programs
- **Lazy loading**: Opcodes and mappings loaded once and cached
