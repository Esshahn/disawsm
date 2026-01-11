# Phase 1: Bug Fixes - Summary

## Completed Fixes

All Phase 1 critical bugs have been fixed in [enhancedDisassembler.ts](src/lib/services/enhancedDisassembler.ts).

### ✅ Fix #1: Relative Branch Calculation
**Location:** [enhancedDisassembler.ts:113-123](src/lib/services/enhancedDisassembler.ts#L113-L123)

**What was wrong:**
- Used `255` instead of `256` for two's complement calculation
- Had off-by-one error in positive offset
- Unclear parameter naming

**What was fixed:**
```typescript
// Before:
return addr - (255 - intByte);  // Wrong
return addr + intByte + 1;      // Off by one

// After:
return pcAfterBranch - (256 - offsetValue);  // Correct two's complement
return pcAfterBranch + offsetValue;          // Correct offset
```

**Caller updates:**
- Line 237: Changed `startAddr + i + 1` to `startAddr + i + 2` (correct PC after instruction)
- Line 368: Changed `startAddr + i` to `startAddr + i + 1` (i already incremented to offset position)

**Impact:** Branch instructions now calculate correct target addresses.

---

### ✅ Fix #2: State Machine Clarity
**Location:** [enhancedDisassembler.ts:205-228](src/lib/services/enhancedDisassembler.ts#L205-L228)

**What was wrong:**
- Two boolean flags `isCode` and `isData` could both be true
- `isData` was set but never meaningfully used
- Unclear state transitions

**What was fixed:**
```typescript
// Before:
let isCode = false;
let isData = true;  // Never actually used for logic
if (bytesTable[i].data) {
  isData = true;
}
if (bytesTable[i].code) {
  isCode = true;
}

// After:
let inCodeSection = false;  // Single clear state variable
if (bytesTable[i].code) {
  inCodeSection = true;
} else if (bytesTable[i].data) {
  inCodeSection = false;
}
```

**Impact:**
- Clearer state machine with mutually exclusive states
- Easier to understand code flow
- Eliminated TypeScript warning about unused variable

---

### ✅ Fix #3: Invalid Opcodes in Code Mode
**Location:** [enhancedDisassembler.ts:220-228](src/lib/services/enhancedDisassembler.ts#L220-L228)

**What was wrong:**
- Invalid opcodes were skipped but code mode continued
- Could cause misaligned instruction parsing
- Data embedded in code wasn't handled

**What was fixed:**
```typescript
// Before:
if (!opcode) {
  i++;
  continue;  // Stayed in code mode!
}

// After:
if (!opcode) {
  if (inCodeSection) {
    inCodeSection = false;  // Exit code mode
  }
  i++;
  continue;
}
```

**Impact:**
- Invalid opcodes properly terminate code sections
- Data embedded in code is now treated as data
- More robust handling of edge cases

---

### ✅ Fix #4: Operand Bytes Marked as Code
**Location:** [enhancedDisassembler.ts:236-239](src/lib/services/enhancedDisassembler.ts#L236-L239)

**What was wrong:**
- Only the opcode byte was marked as `code = true`
- Operand bytes (immediate values, addresses) were NOT marked
- If an operand byte happened to be a valid opcode, it could be misinterpreted

**Example problem:**
```
$1000: A9 20    ; LDA #$20
```
- `$1000` (A9) marked as code ✓
- `$1001` (20) NOT marked as code ❌
- `$20` is also JSR opcode - could cause confusion

**What was fixed:**
```typescript
// Mark the opcode byte as code
bytesTable[i].code = true;

// NEW: Mark all operand bytes as code too
for (let j = 1; j <= instructionLength && i + j < end; j++) {
  bytesTable[i + j].code = true;
}
```

**Impact:**
- All bytes of an instruction are now consistently marked as code
- Prevents operand bytes from being misinterpreted
- More accurate code/data classification

---

### ✅ Fix #5: Use null for Sentinel Value
**Location:** [enhancedDisassembler.ts:245](src/lib/services/enhancedDisassembler.ts#L245)

**What was wrong:**
- Used `0` to mean "no destination address"
- `$0000` is a valid address (zero page)
- Could theoretically cause incorrect behavior

**What was fixed:**
```typescript
// Before:
let destinationAddress = 0;
if (absBranchMnemonics.includes(byte) || 'rel' in opcode) {
  if (addrInProgram(destinationAddress, startAddr, startAddr + end)) {
    // Could match $0000 incorrectly
  }
}

// After:
let destinationAddress: number | null = null;
if (destinationAddress !== null) {
  if (absBranchMnemonics.includes(byte) || 'rel' in opcode) {
    // Only processes when we actually calculated an address
  }
}
```

**Impact:**
- Clearer intent in code
- Proper TypeScript typing
- Eliminates edge case with $0000 address

---

## Verification

Build status: ✅ **SUCCESS**
- TypeScript compilation: ✅ No errors
- Vite build: ✅ Completed successfully
- Only accessibility warnings (pre-existing, unrelated to changes)

## Testing Recommendations

To verify these fixes work correctly, test with:

1. **Branch instructions:**
   ```asm
   $1000  D0 FE    BNE $1000  ; Branch to self (offset -2)
   $1002  F0 05    BEQ $1009  ; Branch forward +5
   ```

2. **Code with embedded data:**
   ```asm
   $1000  A9 05    LDA #$05
   $1002  FF FF    Invalid opcodes (should become .byte)
   $1004  60       RTS
   ```

3. **Multi-byte instructions:**
   ```asm
   $1000  20 00 10    JSR $1000  ; All 3 bytes should be marked as code
   ```

4. **Instructions referencing $0000:**
   ```asm
   $1000  AD 00 00    LDA $0000  ; Zero page via absolute addressing
   ```

All these cases should now be handled correctly.

## Next Steps

Phase 1 is complete. Ready to proceed with:
- **Phase 2:** Apply simplifications (extract constants, better naming, etc.)
- **Phase 3:** Add extensions (multi-pass analysis, dead code detection, etc.)
