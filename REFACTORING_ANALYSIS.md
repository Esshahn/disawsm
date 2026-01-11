# Disassembler Refactoring Analysis

## Part 1: Bugs and Logical Errors

### 🐛 Critical Bug #1: Incorrect Relative Branch Calculation
**Location:** [enhancedDisassembler.ts:107-117](src/lib/services/enhancedDisassembler.ts#L107-L117)

```typescript
function getAbsFromRelative(byte: string, addr: number): number {
  const intByte = hexToNumber(byte);

  if (intByte > 127) {
    // subtract (255 - highbyte) from current address
    return addr - (255 - intByte);  // ❌ WRONG CALCULATION
  } else {
    // add highbyte to current address
    return addr + intByte + 1;       // ❌ OFF BY ONE
  }
}
```

**Problem:**
- Negative offset calculation is incorrect: should be `addr - (256 - intByte)` not `addr - (255 - intByte)`
- Positive offset has off-by-one: the `+1` is wrong because `addr` already points to the byte AFTER the branch instruction

**Example:**
```
Address  Bytes       Instruction
$1000    D0 FE       BNE $1000   ; branch to self (offset -2)
```

With current code:
- `addr = $1001` (points to the offset byte)
- `intByte = $FE = 254`
- Calculation: `$1001 - (255 - 254) = $1001 - 1 = $1000` ✓ (accidentally correct)

But for positive branches:
```
$1000    D0 05       BNE $1007   ; branch forward +5
```
- `addr = $1001`
- `intByte = $05 = 5`
- Calculation: `$1001 + 5 + 1 = $1007` ✓ (works but conceptually wrong)

**The actual issue:** The function receives `addr` as `startAddr + i + 1` from line 231, so it's already pointing past the offset byte. The `+1` compensates for a misunderstanding of what address is passed in.

**Correct implementation:**
```typescript
// addr should be the address AFTER the offset byte (PC after instruction)
function getAbsFromRelative(offset: string, pcAfterInstruction: number): number {
  const offsetValue = hexToNumber(offset);

  if (offsetValue > 127) {
    // Negative offset: treat as signed byte
    return pcAfterInstruction - (256 - offsetValue);
  } else {
    // Positive offset
    return pcAfterInstruction + offsetValue;
  }
}
```

### 🐛 Bug #2: Missing State Reset Between isCode and isData
**Location:** [enhancedDisassembler.ts:211-217](src/lib/services/enhancedDisassembler.ts#L211-L217)

```typescript
if (bytesTable[i].data) {
  isData = true;
}

if (bytesTable[i].code) {
  isCode = true;
}
```

**Problem:** Both flags are set but never mutually reset. If a byte is marked as code, `isCode = true` is set, but `isData` remains whatever it was before. This means both can be true simultaneously during the loop execution.

**Impact:** Low - because the actual behavior depends on the order of checks and the subsequent `if (isCode)` block, but it makes the state machine confusing.

### 🐛 Bug #3: Infinite Loop Risk with Invalid Opcodes
**Location:** [enhancedDisassembler.ts:206-209](src/lib/services/enhancedDisassembler.ts#L206-L209)

```typescript
if (!opcode) {
  i++;
  continue;
}
```

**Problem:** If an invalid opcode is encountered while `isCode = true`, the loop:
1. Skips the byte (`i++`)
2. Continues to next iteration
3. Next byte might also be invalid (part of data)
4. Never exits code mode

**Scenario:**
```
$1000: code entrypoint
$1000: EA        ; NOP (valid)
$1001: 01 02 03 ; Invalid opcodes (data embedded in code)
$1004: 60        ; RTS
```

The loop will mark bytes $1001-$1003 as code but skip over them without processing, potentially misaligning instruction boundaries.

**Fix:** Invalid opcodes while in code mode should either exit code mode or be marked as data.

### 🐛 Bug #4: Instruction Length Not Used to Mark Operand Bytes
**Location:** [enhancedDisassembler.ts:254](src/lib/services/enhancedDisassembler.ts#L254)

```typescript
i += instructionLength;
```

**Problem:** The operand bytes of an instruction are NOT marked as code. Only the opcode byte gets `code = true`. This means:

```
$1000: A9 05    ; LDA #$05
```

- `$1000` marked as code ✓
- `$1001` NOT marked as code ❌

**Impact:** If something later marks `$1001` as a destination, it might be treated as a separate instruction. The operand bytes should be marked as code too.

### 🐛 Bug #5: Double Increment in Main Loop
**Location:** [enhancedDisassembler.ts:254-257](src/lib/services/enhancedDisassembler.ts#L254-L257)

```typescript
i += instructionLength;
}

i++;  // ← ALWAYS EXECUTED
```

**Problem:** This is actually CORRECT but confusing. The increment logic is:
- Inside code block: `i += instructionLength` (skip operands)
- Outside code block: `i++` (skip the opcode we just processed)

However, this means for a 3-byte instruction:
- Start at opcode: `i = 0`
- Skip operands: `i += 2` → `i = 2`
- Skip opcode: `i++` → `i = 3` ✓

This works but is non-obvious. The final `i++` skips the opcode itself.

### ⚠️ Warning #6: destinationAddress Can Be Zero
**Location:** [enhancedDisassembler.ts:228](src/lib/services/enhancedDisassembler.ts#L228)

```typescript
let destinationAddress = 0;
```

**Problem:** Zero is a valid address ($0000 is ZP). Using 0 as a default means we might accidentally treat address $0000 as "no destination calculated."

**Impact:** Low in practice (6502 programs rarely jump to ZP), but conceptually wrong.

**Fix:** Use `null` or `-1` as the sentinel value.

### 🐛 Bug #7: absAddressMnemonics Misses Some Instructions
**Location:** [enhancedDisassembler.ts:160-177](src/lib/services/enhancedDisassembler.ts#L160-L177)

The list includes load/store operations but is incomplete:

**Missing:**
- `$0C` - TSB (65C02)
- `$1C` - TRB (65C02)
- `$2C` - BIT absolute
- `$4C` - JMP absolute (listed as branch but also reads from that address in some contexts)
- `$6C` - JMP indirect (reads from address)
- Indexed indirect and indirect indexed modes might access computed addresses

**Note:** This might be intentional (focusing on common patterns), but it means some data accesses won't be detected.

---

## Part 2: Simplification Opportunities

### 💡 Simplification #1: State Machine Clarity

**Current:** Two boolean flags `isCode` and `isData` that can both be true
**Better:** Single enum state

```typescript
enum AnalysisState {
  Unknown,
  InCode,
  InData
}

let state = AnalysisState.Unknown;

// Transition based on byte marking
if (bytesTable[i].code) {
  state = AnalysisState.InCode;
} else if (bytesTable[i].data) {
  state = AnalysisState.InData;
}

// Process based on state
switch (state) {
  case AnalysisState.InCode:
    // ... code processing
    if (defaultToDataAfter.includes(byte)) {
      state = AnalysisState.Unknown;
    }
    break;

  case AnalysisState.InData:
  case AnalysisState.Unknown:
    // ... data processing
    break;
}
```

**Benefits:**
- Clearer state transitions
- Impossible to be in both states simultaneously
- Easier to add new states (e.g., "InString", "InTable")

### 💡 Simplification #2: Extract Opcode Categories to Constants

**Current:** Magic arrays scattered in the code
**Better:** Named constants with documentation

```typescript
// Opcodes that terminate code flow
const FLOW_TERMINATORS = new Set(['4c', '60', '40']);  // JMP, RTS, RTI

// Opcodes that branch to code
const CODE_BRANCHES = new Set(['4c', '20']);  // JMP, JSR

// Opcodes that access data (memory read/write)
const DATA_ACCESS_OPS = new Set([
  '0d', '0e', // ORA, ASL (absolute)
  // ... etc
]);

// All branch opcodes (relative addressing)
const RELATIVE_BRANCHES = new Set([
  '10', '30', '50', '70',  // BPL, BMI, BVC, BVS
  '90', 'b0', 'd0', 'f0'   // BCC, BCS, BNE, BEQ
]);
```

**Benefits:**
- Self-documenting
- Easy to modify
- Set lookup is O(1) and clearer than `.includes()`

### 💡 Simplification #3: Separate Concerns - Analysis vs. Metadata

**Current:** `analyze()` does two things:
1. Walks through code to mark bytes
2. Marks branch/jump destinations

**Better:** Split into two passes:

```typescript
// Pass 1: Mark explicit entrypoints
function markEntrypoints(bytesTable, entrypoints) { ... }

// Pass 2: Propagate code/data markings following control flow
function propagateCodeData(bytesTable) { ... }

// Wrapper
function analyze(startAddr, bytes, entrypoints) {
  const bytesTable = generateByteArray(startAddr, bytes);
  markEntrypoints(bytesTable, entrypoints);
  propagateCodeData(bytesTable);
  return bytesTable;
}
```

**Benefits:**
- Each function has single responsibility
- Easier to test
- Clearer logic flow

### 💡 Simplification #4: Helper Functions for Instruction Decoding

**Current:** Inline logic for parsing instructions
**Better:** Extract helpers

```typescript
interface DecodedInstruction {
  opcode: string;
  length: number;  // Total bytes (opcode + operands)
  operands: string[];  // Hex strings
  isRelativeBranch: boolean;
  destinationAddress?: number;  // Computed address if applicable
}

function decodeInstruction(
  bytesTable: DisassembledByte[],
  index: number,
  startAddr: number
): DecodedInstruction | null {
  const byte = bytesTable[index].byte;
  const opcode = opcodes[byte];

  if (!opcode) return null;

  // ... decode logic

  return {
    opcode: opcode.ins,
    length: 1 + operandLength,
    operands: [...],
    isRelativeBranch: 'rel' in opcode,
    destinationAddress: ...
  };
}
```

**Benefits:**
- Reusable in both `analyze()` and `convertToProgram()`
- Testable in isolation
- Cleaner main loop

### 💡 Simplification #5: Consolidate Hex Conversion

**Current:** Multiple small conversion functions
**Better:** Single utility object

```typescript
const Hex = {
  toByte: (num: number) => num.toString(16).padStart(2, '0'),
  toWord: (num: number) => num.toString(16).padStart(4, '0'),
  fromByte: (hex: string) => parseInt(hex, 16),
  toAddress: (highByte: string, lowByte: string) =>
    (parseInt(highByte, 16) << 8) + parseInt(lowByte, 16)
};
```

### 💡 Simplification #6: Remove Redundant Code Check

**Location:** [enhancedDisassembler.ts:332-340](src/lib/services/enhancedDisassembler.ts#L332-L340)

```typescript
// DATA
if (!byteData.code || byteData.data) {
  // ... handle as data
}

// CODE
if (byteData.code) {  // ← This check is redundant
```

**Fix:** Use `else` since the first condition handles all non-code cases:

```typescript
if (!byteData.code || byteData.data) {
  // Handle as data
} else {
  // Must be code
  // ... handle as code
}
```

### 💡 Simplification #7: Better Variable Names

**Current:** Ambiguous names
- `i` - index (ok)
- `end` - confusing (is it address or length?)
- `byte` - sometimes string, sometimes number
- `addr` - sometimes start address, sometimes destination

**Better:**
- `currentIndex` or keep `i` (convention is fine)
- `byteCount` instead of `end`
- `byteHex` for string, `byteValue` for number
- `targetAddress`, `destinationAddress`, `baseAddress`

---

## Part 3: Extension Opportunities

### 🚀 Extension #1: Multi-Pass Analysis for Better Accuracy

**Current:** Single pass means some code regions may be missed

**Improvement:** Iterate until convergence

```typescript
function analyzeMultiPass(startAddr, bytes, entrypoints) {
  let bytesTable = generateByteArray(startAddr, bytes);
  markEntrypoints(bytesTable, entrypoints);

  let changed = true;
  let passCount = 0;
  const MAX_PASSES = 10;

  while (changed && passCount < MAX_PASSES) {
    changed = propagateCodeData(bytesTable);
    passCount++;
  }

  return bytesTable;
}
```

**Benefits:**
- Handles forward references better
- Finds code sections reachable through multiple jumps
- Converges to stable state

### 🚀 Extension #2: Confidence Scoring

**Current:** Binary code/data classification
**Better:** Probability/confidence scores

```typescript
interface DisassembledByte {
  addr: number;
  byte: string;
  dest: boolean;
  codeConfidence: number;  // 0.0 - 1.0
  dataConfidence: number;  // 0.0 - 1.0
}
```

**Scoring factors:**
- Entrypoints: 1.0 confidence
- Reachable via jump: 0.9 confidence
- Sequential from code: 0.8 confidence
- Has valid opcode: +0.1
- Referenced by load/store: 0.9 data confidence

**Benefits:**
- User can see uncertain regions
- Can threshold for different use cases (strict vs. permissive)
- Better for mixed code/data

### 🚀 Extension #3: Dead Code Detection

Track which code is actually reachable from entrypoints:

```typescript
interface DisassembledByte {
  // ... existing fields
  reachable: boolean;  // Can this be reached from any entrypoint?
}
```

**Algorithm:**
- Start with entrypoints as reachable
- Follow all jumps/branches/sequential flow
- Anything not visited is dead code

**Benefits:**
- Highlight unused code sections
- Detect data incorrectly marked as code
- Optimization opportunities

### 🚀 Extension #4: Data Pattern Recognition

**Current:** All data is `.byte` directives
**Better:** Recognize common patterns

```typescript
// Detect strings (contiguous printable ASCII + terminator)
if (isString(bytes)) {
  return `.text "Hello World"`
}

// Detect word tables (pairs of bytes, all valid addresses)
if (isAddressTable(bytes)) {
  return `.word L1000, L1050, L1100`
}

// Detect screen memory (40-column repeated patterns)
if (isScreenData(bytes)) {
  return `.screen "..."`
}
```

**Benefits:**
- More readable output
- Easier to understand data sections
- Preserves programmer intent

### 🚀 Extension #5: Illegal Opcode Handling

**Current:** Undefined opcodes are skipped
**Better:** Recognize documented illegal opcodes

Many 6502 "illegal" opcodes have known behavior and are used in practice:
- `$0B` - ANC (AND + set carry)
- `$8F` - SAX (store A & X)
- etc.

```typescript
const illegalOpcodes = {
  '0b': { ins: 'anc #$hh', ill: 1 },
  '8f': { ins: 'sax $hhll', ill: 1 },
  // ...
};

// In analyze():
if (!opcode) {
  const illegalOp = illegalOpcodes[byte];
  if (illegalOp && isCode) {
    // Treat as valid instruction
  } else {
    // Exit code mode - truly invalid
    isCode = false;
  }
}
```

**Benefits:**
- Support for "real world" 6502 code
- Better analysis of C64/NES/Apple II programs
- Optional (can be disabled for strict mode)

### 🚀 Extension #6: Jump Table Detection

Recognize common jump table patterns:

```asm
    JMP (TABLE,X)   ; or  LDA TABLE,X / PHA / LDA TABLE+1,X / PHA / RTS
TABLE:
    .word SUB1, SUB2, SUB3
```

**Algorithm:**
- Detect `JMP ($xxxx,X)` or equivalent
- Scan `$xxxx` for word-sized values
- Mark each word's target as code entrypoint

**Benefits:**
- Finds code sections missed by static analysis
- Handles computed jumps
- Common pattern in 6502 code

### 🚀 Extension #7: Subroutine Boundary Detection

Track where subroutines start/end:

```typescript
interface Subroutine {
  entryAddress: number;
  exitAddresses: number[];  // All RTS/RTI locations
  localLabels: number[];    // Branch targets within subroutine
  calledFrom: number[];     // JSR sources
}
```

**Benefits:**
- Generate better labels (e.g., `ProcessPlayer` vs `L1000`)
- Group related code
- Detect local vs. global branches
- Better documentation generation

### 🚀 Extension #8: Heuristic Improvements

**Current:** Simple heuristics
**Better:** Machine learning or statistical approach

- Train on known good disassemblies
- Learn patterns: "what does code look like?"
  - Opcode frequency distribution
  - Common instruction sequences
  - Valid addressing mode combinations
- Score unknown regions based on learned patterns

**Simpler version:** Opcode frequency analysis
```typescript
// Valid code tends to have certain opcodes more frequently
const COMMON_OPCODES = ['a9', '8d', 'ad', '20', '4c', '60'];
const RARE_IN_CODE = ['ff', 'fe', 'fd'];

function computeCodeLikelihood(bytes: string[]): number {
  let score = 0;
  for (const byte of bytes) {
    if (COMMON_OPCODES.includes(byte)) score += 2;
    if (RARE_IN_CODE.includes(byte)) score -= 1;
  }
  return score / bytes.length;
}
```

---

## Summary

### Bugs to Fix (Priority Order):
1. ✅ Fix relative branch calculation (critical for correctness)
2. ✅ Handle invalid opcodes in code mode properly
3. ✅ Mark instruction operand bytes as code
4. ✅ Clear state machine logic (isCode/isData)
5. ✅ Use null for "no destination" instead of 0
6. ⚠️ Review absAddressMnemonics completeness (optional)

### Simplifications to Apply:
1. ✅ State machine enum instead of two booleans
2. ✅ Extract opcode categories to named constants
3. ✅ Use else instead of redundant if check
4. ⚠️ Split analyze() into smaller functions (optional - adds LOC)
5. ⚠️ Extract instruction decoder (optional - may over-abstract)

### Extensions to Consider:
1. 🔥 Multi-pass analysis (high value, moderate complexity)
2. 🔥 Dead code detection (high value, low complexity)
3. 💡 Data pattern recognition (high value, high complexity)
4. 💡 Confidence scoring (medium value, medium complexity)
5. 💡 Illegal opcode support (medium value, low complexity)
6. 💡 Jump table detection (medium value, high complexity)
7. ⚠️ ML-based heuristics (low value, very high complexity)

**Recommendation:** Fix bugs first, apply simple simplifications, then add multi-pass analysis and dead code detection as the most impactful extensions.
