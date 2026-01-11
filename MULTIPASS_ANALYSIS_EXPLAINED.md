# Multi-Pass Analysis Explained

## Current Single-Pass Limitation

The current disassembler uses a **single-pass, left-to-right** analysis. This means:
1. It reads bytes from start to end once
2. Code is only marked when reached sequentially or via forward/backward branches
3. If code jumps to a location before that location is analyzed, the target won't be marked as code until the scan reaches it

### The Problem: Forward References and Non-Linear Code

The single-pass approach fails when:
- Code jumps **forward** to an address that hasn't been analyzed yet
- Code jumps to the **middle** of a data section
- There are **multiple entry points** that converge on the same code
- Jump tables point to code that's not sequentially reachable

---

## Example 1: Forward Jump into Data Section

### Code Layout:
```
Address  Bytes       What it is
--------------------------------------
$1000    20 50 10    JSR $1050        ; Jump forward
$1003    01 02 03    Data (looks like opcodes)
$1006    04 05 06    More data
...
$1050    A9 42       LDA #$42         ; Target of JSR
$1052    60          RTS
```

### Single-Pass Analysis (CURRENT):

**Pass 1 (left to right):**
```
i=0: $1000 - JSR $1050
  - Mark $1000 as code ✓
  - See JSR target is $1050
  - Mark $1050 as code ✓
  - Mark $1050 as dest ✓

i=3: $1003 - byte $01
  - Not in code section (JSR doesn't fall through)
  - Treat as data ✓

i=4: $1004 - byte $02
  - Not in code section
  - Treat as data ✓

... continue treating as data ...

i=80 ($1050): byte $A9 (LDA)
  - This byte was marked as code by JSR
  - Enter code section ✓
  - Mark $A9 as code
  - It's LDA #$hh, so mark $1051 as code too ✓

i=82 ($1052): byte $60 (RTS)
  - Still in code section
  - Mark as code ✓
  - RTS terminates, exit code section
```

**Result:** ✅ **WORKS**
- $1003-$104F correctly treated as data
- $1050-$1052 correctly treated as code

---

## Example 2: Backward Jump Creating Loop

### Code Layout:
```
Address  Bytes       What it is
--------------------------------------
$1000    A9 00       LDA #$00         ; Entry point
$1002    8D 00 04    STA $0400
$1005    4C 00 10    JMP $1000        ; Jump backward to start
$1008    01 02 03    Data after infinite loop
```

### Single-Pass Analysis (CURRENT):

**Pass 1:**
```
i=0: $1000 - LDA #$00
  - Entry point marked this as code
  - Enter code section ✓
  - Mark $1000-$1001 as code

i=2: $1002 - STA $0400
  - Still in code section
  - Mark $1002-$1004 as code
  - $0400 is outside program, ignored

i=5: $1005 - JMP $1000
  - Still in code section
  - Mark $1005-$1007 as code
  - See JMP target is $1000 (backward)
  - $1000 already marked as code ✓
  - JMP terminates code flow
  - Exit code section

i=8: $1008 - byte $01
  - Not in code section
  - Treat as data ✓
```

**Result:** ✅ **WORKS**
- Backward jumps work fine because target was already analyzed

---

## Example 3: Jump Table (FAILS IN SINGLE-PASS)

### Code Layout:
```
Address  Bytes       What it is
--------------------------------------
$1000    A9 02       LDA #$02         ; Entry point
$1002    0A          ASL A            ; Multiply by 2
$1003    AA          TAX
$1004    BD 0A 10    LDA $100A,X      ; Load from jump table
$1007    48          PHA
$1008    BD 0B 10    LDA $100B,X
$100B    48          PHA
$100C    60          RTS              ; Return to computed address

; Jump Table (data!)
$100A    20 10       .word $1020      ; Pointer to function 1
$100C    40 10       .word $1040      ; Pointer to function 2
$100E    60 10       .word $1060      ; Pointer to function 3

; Functions
$1020    A9 01       LDA #$01         ; Function 1
$1022    60          RTS

$1040    A9 02       LDA #$02         ; Function 2
$1042    60          RTS

$1060    A9 03       LDA #$03         ; Function 3
$1062    60          RTS
```

### Single-Pass Analysis (CURRENT):

**Pass 1:**
```
i=0: $1000 - LDA #$02
  - Entry point, mark as code ✓
  - Mark $1000-$1001 as code

i=2: $1002 - ASL A
  - In code section
  - Mark as code ✓

i=3: $1003 - TAX
  - In code section
  - Mark as code ✓

i=4: $1004 - LDA $100A,X
  - In code section
  - Mark $1004-$1006 as code
  - This is a LDA (data access)
  - Mark $100A as DATA ❌ (wrong! it's part of jump table)
  - Mark $100A as dest

i=7: $1007 - PHA
  - In code section
  - Mark as code ✓

i=8: $1008 - LDA $100B,X
  - In code section
  - Mark $1008-$100A as code
  - Mark $100B as DATA ❌
  - Mark $100B as dest

i=11: $100B - PHA
  - In code section
  - Mark as code ✓

i=12: $100C - RTS
  - In code section
  - Mark as code ✓
  - Exit code section

i=13 ($100A): byte $20
  - Not in code section (RTS terminated)
  - BUT marked as DATA destination earlier
  - Treat as data ✓

i=14 ($100B): byte $10
  - Marked as data
  - Treat as data ✓

i=15 ($100C): byte $40
  - Not marked as anything
  - Treat as data ✓

... continue ...

i=32 ($1020): byte $A9 (LDA)
  - NOT marked as code ❌
  - NOT marked as dest ❌
  - Treat as DATA ❌ ❌ ❌

i=34 ($1022): byte $60 (RTS)
  - NOT marked as code ❌
  - Treat as DATA ❌

i=64 ($1040): byte $A9 (LDA)
  - NOT marked as code ❌
  - Treat as DATA ❌

... etc
```

**Result:** ❌ **FAILS**
- $100A-$100F treated as data ✓ (correct for jump table)
- $1020-$1022 treated as data ❌ (should be code!)
- $1040-$1042 treated as data ❌ (should be code!)
- $1060-$1062 treated as data ❌ (should be code!)

**Why it fails:** The disassembler can't statically analyze computed jumps. It doesn't know that the bytes at $100A-$100F are addresses pointing to code.

---

## Example 4: Multiple Entry Points Converging (FAILS)

### Code Layout:
```
Address  Bytes       What it is
--------------------------------------
$1000    4C 20 10    JMP $1020        ; Entry point 1
$1003    01 02 03    Data
...
$1010    20 20 10    JSR $1020        ; Entry point 2 (user adds later)
$1013    60          RTS
...
$1020    A9 42       LDA #$42         ; Shared subroutine
$1022    60          RTS
```

### Single-Pass with Only First Entry Point:

**User initially marks only $1000 as code entry point:**
```
i=0: $1000 - JMP $1020
  - Entry point, enter code section ✓
  - Mark $1000-$1002 as code
  - Mark $1020 as code dest ✓
  - JMP terminates, exit code section

i=3: $1003 - byte $01
  - Not in code section
  - Treat as data ✓

... continue as data ...

i=16 ($1010): byte $20 (JSR)
  - Not in code section
  - No entry point marked here
  - Treat as DATA ❌ (should be code!)

i=19 ($1013): byte $60 (RTS)
  - Treat as DATA ❌

i=32 ($1020): byte $A9
  - Was marked as code by JMP earlier ✓
  - Enter code section
  - Mark as code ✓
```

**Result:** ❌ **PARTIALLY FAILS**
- $1020 correctly identified as code (reached from first entry)
- But $1010-$1013 missed as code

**If user later adds $1010 as entry point:**
- Need to re-run entire analysis
- Single-pass doesn't update previously analyzed bytes

---

## Example 5: Forward Branch Over Data (FAILS SUBTLY)

### Code Layout:
```
Address  Bytes       What it is
--------------------------------------
$1000    A9 01       LDA #$01         ; Entry point
$1002    F0 05       BEQ $1009        ; Skip over data
$1004    20 10 10    JSR $1010        ; Alternative path
$1007    4C 09 10    JMP $1009        ; Join back
$100A    01 02       Data (skipped)
$100C    03 04       Data (skipped)
$100E    A9 FF       LDA #$FF         ; Common code
$1010    60          RTS
```

### Single-Pass Analysis:

**Pass 1:**
```
i=0: $1000 - LDA #$01
  - Entry point, mark as code ✓
  - Mark $1000-$1001

i=2: $1002 - BEQ $1009
  - In code section
  - Mark $1002-$1003 as code
  - Branch target is $1009
  - Mark $1009 as code dest ✓
  - Branch doesn't terminate, continue

i=4: $1004 - JSR $1010
  - In code section
  - Mark $1004-$1006 as code
  - JSR target is $1010
  - Mark $1010 as code dest ✓

i=7: $1007 - JMP $1009
  - In code section
  - Mark $1007-$1009 as code
  - JMP target is $1009 (already marked)
  - JMP terminates, exit code section

i=10 ($100A): byte $01
  - Not in code section
  - Treat as data ✓

i=11 ($100B): byte $02
  - Treat as data ✓

i=12 ($100C): byte $03
  - Treat as data ✓

i=13 ($100D): byte $04
  - Treat as data ✓

i=14 ($100E): byte $A9 (LDA)
  - Not in code section
  - Not marked as dest
  - Treat as DATA ❌ (should be code!)

i=16 ($1010): byte $60 (RTS)
  - Was marked as code by JSR
  - Enter code section ✓
  - Mark as code ✓
```

**Result:** ❌ **FAILS**
- $100A-$100D correctly data ✓
- $100E-$100F missed as code ❌
- The code at $1009 was marked as dest, but we jumped over it at $1007
- We never actually "arrived" at $1009 in the sequential scan

---

## Multi-Pass Solution

### How Multi-Pass Works:

```
Pass 1: Mark initial entry points
Pass 2: Scan sequentially, mark reachable code/data
Pass 3: Check if any new code was marked
Pass 4: If yes, scan again from those new locations
... repeat until no changes ...
```

### Algorithm Pseudocode:

```typescript
function analyzeMultiPass(startAddr, bytes, entrypoints) {
  let bytesTable = generateByteArray(startAddr, bytes);
  const byteCount = bytesTable.length;

  // Phase 1: Mark initial entrypoints
  markEntrypoints(bytesTable, entrypoints, startAddr);

  // Phase 2: Iterate until convergence
  let changed = true;
  let passCount = 0;
  const MAX_PASSES = 10; // Safety limit

  while (changed && passCount < MAX_PASSES) {
    changed = propagateCodeData(bytesTable, startAddr);
    passCount++;
  }

  return bytesTable;
}

function propagateCodeData(bytesTable, startAddr): boolean {
  let madeChanges = false;
  const byteCount = bytesTable.length;
  const endAddr = startAddr + byteCount;

  // Track which code sections we've processed
  const processed = new Set<number>();

  for (let i = 0; i < byteCount; i++) {
    // Skip if already processed
    if (processed.has(i)) continue;

    // Skip if not marked as code
    if (!bytesTable[i].code) continue;

    // Found a code entry point we haven't processed
    // Walk the code from here
    let currentIndex = i;
    let inCodeSection = true;

    while (inCodeSection && currentIndex < byteCount) {
      processed.add(currentIndex);

      const byteHex = bytesTable[currentIndex].byte;
      const opcode = opcodes[byteHex];

      if (!opcode) {
        inCodeSection = false;
        break;
      }

      // Mark this byte as code (might already be marked)
      if (!bytesTable[currentIndex].code) {
        bytesTable[currentIndex].code = true;
        madeChanges = true;
      }

      const instructionLength = getInstructionLength(opcode.ins);

      // Mark operand bytes
      for (let j = 1; j <= instructionLength; j++) {
        if (currentIndex + j < byteCount) {
          if (!bytesTable[currentIndex + j].code) {
            bytesTable[currentIndex + j].code = true;
            madeChanges = true;
          }
        }
      }

      // Check for branches/jumps
      let targetAddress = null;

      if ('rel' in opcode && currentIndex + 1 < byteCount) {
        targetAddress = getAbsFromRelative(
          bytesTable[currentIndex + 1].byte,
          startAddr + currentIndex + 2
        );
      }

      if (instructionLength === 2 && currentIndex + 2 < byteCount) {
        targetAddress = bytesToAddr(
          bytesTable[currentIndex + 2].byte,
          bytesTable[currentIndex + 1].byte
        );
      }

      // Mark target as code if it's a branch/jump
      if (targetAddress !== null) {
        if (CODE_BRANCH_OPS.has(byteHex) || 'rel' in opcode) {
          if (addrInProgram(targetAddress, startAddr, endAddr)) {
            const targetIndex = targetAddress - startAddr;
            if (!bytesTable[targetIndex].code) {
              bytesTable[targetIndex].code = true;
              bytesTable[targetIndex].dest = true;
              madeChanges = true;
            }
          }
        }

        if (DATA_ACCESS_OPS.has(byteHex)) {
          if (addrInProgram(targetAddress, startAddr, endAddr)) {
            const targetIndex = targetAddress - startAddr;
            if (!bytesTable[targetIndex].data) {
              bytesTable[targetIndex].data = true;
              bytesTable[targetIndex].dest = true;
              madeChanges = true;
            }
          }
        }
      }

      // Check if this instruction terminates code flow
      if (FLOW_TERMINATORS.has(byteHex)) {
        inCodeSection = false;
      }

      currentIndex += instructionLength + 1;
    }
  }

  return madeChanges;
}
```

### Example 5 with Multi-Pass:

**Code:**
```
$1000    A9 01       LDA #$01         ; Entry point
$1002    F0 05       BEQ $1009        ; Skip over data
$1004    20 10 10    JSR $1010
$1007    4C 09 10    JMP $1009
$100A    01 02       Data
$100C    03 04       Data
$100E    A9 FF       LDA #$FF
$1010    60          RTS
```

**Pass 1:**
- Start at $1000 (entry point)
- Sequential scan: $1000→$1002→$1004→$1007
- Mark $1009 as code dest (from BEQ)
- Mark $1010 as code dest (from JSR)
- Mark $1009 as code dest (from JMP)
- Stop at JMP (terminates)
- Changes made: YES

**Pass 2:**
- Found new code dest at $1009 (not processed yet)
- Start walking from $1009
- But wait - $1009 is in middle of JMP instruction!
- Actually $1009 is byte $09 (part of previous JMP)
- Skip it
- Found new code dest at $1010
- Walk from $1010: just RTS
- Changes made: NO

**Result:** Still doesn't work perfectly! We need smarter analysis.

---

## The Real Solution: Control Flow Graph

For jump tables and truly complex code, we need:
1. **Manual hints** - User marks jump table entries
2. **Pattern recognition** - Detect `LDA table,X / PHA / RTS` pattern
3. **Control flow graph** - Build graph of all possible paths
4. **Data flow analysis** - Track register values to compute jump targets

Multi-pass helps with **simple forward references** but not **computed jumps**.

---

## When Multi-Pass Helps

Multi-pass is beneficial for:
✅ Code sections added as new entrypoints after initial analysis
✅ Forward jumps that create new code islands
✅ Complex branching where paths rejoin
✅ Code that's reached through multiple different paths

Multi-pass does NOT help with:
❌ Jump tables (computed jumps)
❌ Self-modifying code
❌ Indirect jumps `JMP ($xxxx)`
❌ Data tables embedded in code (need manual marking)

---

## Complexity Comparison

**Single-Pass:**
- Time: O(n) where n = number of bytes
- Space: O(n) for byte table
- Passes: 1

**Multi-Pass:**
- Time: O(n × p) where p = number of passes (typically 2-3)
- Space: O(n) for byte table
- Passes: Until convergence (usually 2-5)

For most programs, multi-pass adds minimal overhead but catches edge cases that single-pass misses.

---

## Summary

**Single-pass works well for:**
- Linear code with backward branches
- Code with forward jumps marked by entrypoints
- Simple programs with clear code/data sections

**Multi-pass is needed for:**
- Dynamic entry point discovery
- Forward references that create code islands
- Complex control flow graphs
- Iterative refinement as users add hints

**Both struggle with:**
- Computed jumps (jump tables)
- Indirect addressing
- Self-modifying code
- Mixed code/data without hints
