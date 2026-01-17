# Scripts

This directory contains maintenance and build scripts for the disassembler.

---

## enhance-opcodes.ts

**Purpose:** Generates enhanced opcodes.json with metadata from basic opcode definitions.

**Status:** ✅ Production-ready (used to generate current opcodes.json)

### What It Does

1. Reads `public/json/opcodes.json` (current version)
2. Infers metadata for each opcode:
   - `len` - Instruction length (1-3 bytes)
   - `mode` - Addressing mode (12 types)
   - `flow` - Control flow type (call/jump/return/branch)
   - `cycles` - CPU cycle count (base cycles)
3. Writes `public/json/opcodes-enhanced.json`

### Usage

```bash
# Generate enhanced opcodes
npx tsx scripts/enhance-opcodes.ts

# Review the output
cat public/json/opcodes-enhanced.json | less

# If satisfied, replace the original
cp public/json/opcodes-enhanced.json public/json/opcodes.json
rm public/json/opcodes-enhanced.json
```

### When to Use

- **Adding new metadata fields** - Update the script, regenerate
- **Fixing cycle counts** - Modify `getCycles()` function, regenerate
- **Validating opcodes.json** - Regenerate and diff against current
- **Disaster recovery** - If opcodes.json gets corrupted

### Metadata Generated

```json
{
  "a9": {
    "ins": "lda #$hh",      // Original template
    "len": 2,               // ✅ Generated
    "mode": "imm",          // ✅ Generated
    "cycles": 2             // ✅ Generated
  },
  "20": {
    "ins": "jsr $hhll",
    "len": 3,
    "mode": "abs",
    "cycles": 6,
    "flow": "call"          // ✅ Generated (optional)
  }
}
```

### Cycle Count Sources

Cycle counts are based on official 6502 documentation:
- http://www.6502.org/tutorials/6502opcodes.html
- https://www.masswerk.at/6502/6502_instruction_set.html

**Notes:**
- Base cycles only (no page-cross or branch-taken penalties)
- Branch instructions: 2 cycles (+1 if taken, +1 if page cross)
- Read-Modify-Write: 5-7 cycles depending on addressing mode
- Special cases hardcoded for accuracy (BRK=7, JSR=6, etc.)

---

## Adding New Metadata Fields

To add new metadata (example: instruction category):

1. Update the `NewOpcode` interface:
```typescript
interface NewOpcode {
  // ... existing fields
  category?: 'load' | 'store' | 'math' | 'logic' | 'branch' | 'stack' | 'system';
}
```

2. Add inference logic:
```typescript
function inferCategory(mnemonic: string): string | undefined {
  if (['lda', 'ldx', 'ldy'].includes(mnemonic)) return 'load';
  if (['sta', 'stx', 'sty'].includes(mnemonic)) return 'store';
  // ... etc
}
```

3. Update the enhancement loop:
```typescript
const category = inferCategory(mnemonic);
if (category) enhanced.category = category;
```

4. Regenerate opcodes.json

---

## Maintenance

**DO:**
- ✅ Keep this script updated with opcodes.json structure
- ✅ Document any manual changes to cycle counts
- ✅ Test regeneration periodically to ensure script works

**DON'T:**
- ❌ Delete this script (it's our source of truth for metadata generation)
- ❌ Manually edit all 256 opcodes in opcodes.json (update script instead)
- ❌ Commit opcodes-enhanced.json (it's a temporary output file)

---

## Future Enhancements

Possible additions to the script:

1. **Page-cross cycle penalties** - Flag which instructions have +1 cycle on page boundary
2. **Instruction categories** - Group by type (load/store/math/logic/branch)
3. **Affected flags** - Which CPU flags each instruction modifies (N, Z, C, V)
4. **Validation** - Verify all 256 opcodes are present and valid
5. **Comparison mode** - Compare generated output against current opcodes.json

---

## Related Files

- [public/json/opcodes.json](../public/json/opcodes.json) - Production opcode database
- [src/lib/services/enhancedDisassembler.ts](../src/lib/services/enhancedDisassembler.ts) - Uses opcodes.json
