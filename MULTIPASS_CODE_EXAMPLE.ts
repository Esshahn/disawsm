/**
 * Multi-Pass Analysis Implementation Example
 *
 * This file shows how to modify the existing analyze() function
 * to support multi-pass analysis for better code detection.
 */

import type { Entrypoint } from '$lib/stores/entrypoints';
import type { DisassembledByte } from './enhancedDisassembler';

/**
 * CURRENT IMPLEMENTATION (Single-Pass)
 *
 * This scans the bytes once from left to right.
 * Code is marked when encountered sequentially or via branch targets.
 */
export function analyzeSinglePass(
  startAddr: number,
  bytes: Uint8Array,
  entrypoints: Entrypoint[],
  opcodes: any,
  FLOW_TERMINATORS: Set<string>,
  CODE_BRANCH_OPS: Set<string>,
  DATA_ACCESS_OPS: Set<string>
): DisassembledByte[] {
  const bytesTable = generateByteArray(startAddr, bytes);
  const byteCount = bytesTable.length;
  const endAddr = startAddr + byteCount;

  // Phase 1: Mark entrypoints
  markEntrypoints(bytesTable, entrypoints, startAddr, byteCount);

  // Phase 2: Single left-to-right scan
  let inCodeSection = false;

  for (let i = 0; i < byteCount; i++) {
    const byteHex = bytesTable[i].byte;
    const opcode = opcodes[byteHex];

    // Check if current byte switches mode
    if (bytesTable[i].code) {
      inCodeSection = true;
    } else if (bytesTable[i].data) {
      inCodeSection = false;
    }

    if (!opcode) {
      if (inCodeSection) {
        inCodeSection = false;
      }
      continue;
    }

    if (inCodeSection) {
      // Process code section...
      const result = processCodeSection(
        bytesTable,
        i,
        opcode,
        byteHex,
        startAddr,
        endAddr,
        FLOW_TERMINATORS,
        CODE_BRANCH_OPS,
        DATA_ACCESS_OPS
      );

      inCodeSection = result.inCodeSection;
      i = result.nextIndex;
    }
  }

  return bytesTable;
}

/**
 * PROPOSED IMPLEMENTATION (Multi-Pass)
 *
 * This iterates until no new code sections are discovered.
 * Handles forward references and multiple entry points better.
 */
export function analyzeMultiPass(
  startAddr: number,
  bytes: Uint8Array,
  entrypoints: Entrypoint[],
  opcodes: any,
  FLOW_TERMINATORS: Set<string>,
  CODE_BRANCH_OPS: Set<string>,
  DATA_ACCESS_OPS: Set<string>
): DisassembledByte[] {
  const bytesTable = generateByteArray(startAddr, bytes);
  const byteCount = bytesTable.length;
  const endAddr = startAddr + byteCount;

  // Phase 1: Mark initial entrypoints
  markEntrypoints(bytesTable, entrypoints, startAddr, byteCount);

  // Phase 2: Iterate until convergence
  let changed = true;
  let passCount = 0;
  const MAX_PASSES = 10; // Safety limit to prevent infinite loops

  while (changed && passCount < MAX_PASSES) {
    changed = propagateCodeData(
      bytesTable,
      startAddr,
      endAddr,
      opcodes,
      FLOW_TERMINATORS,
      CODE_BRANCH_OPS,
      DATA_ACCESS_OPS
    );
    passCount++;

    // Optional: log progress
    if (changed) {
      console.log(`Pass ${passCount}: Found new code sections`);
    }
  }

  if (passCount >= MAX_PASSES) {
    console.warn('Multi-pass analysis hit maximum passes limit');
  }

  return bytesTable;
}

/**
 * Propagate code/data markings by processing all known code entry points
 *
 * @returns true if any new code was discovered (need another pass)
 */
function propagateCodeData(
  bytesTable: DisassembledByte[],
  startAddr: number,
  endAddr: number,
  opcodes: any,
  FLOW_TERMINATORS: Set<string>,
  CODE_BRANCH_OPS: Set<string>,
  DATA_ACCESS_OPS: Set<string>
): boolean {
  let madeChanges = false;
  const byteCount = bytesTable.length;

  // Track which addresses we've processed in this pass
  // This prevents infinite loops in code with branches
  const processedInThisPass = new Set<number>();

  // Find all code entry points
  for (let i = 0; i < byteCount; i++) {
    // Skip if not marked as code entry
    if (!bytesTable[i].code) continue;

    // Skip if already processed in this pass
    if (processedInThisPass.has(i)) continue;

    // Walk the code section from this entry point
    const changes = walkCodeSection(
      bytesTable,
      i,
      startAddr,
      endAddr,
      opcodes,
      FLOW_TERMINATORS,
      CODE_BRANCH_OPS,
      DATA_ACCESS_OPS,
      processedInThisPass
    );

    if (changes) {
      madeChanges = true;
    }
  }

  return madeChanges;
}

/**
 * Walk a code section from a starting point, marking all reachable bytes
 *
 * @param startIndex - Where to start walking from
 * @param processedInThisPass - Set to track processed indices
 * @returns true if any new bytes were marked
 */
function walkCodeSection(
  bytesTable: DisassembledByte[],
  startIndex: number,
  startAddr: number,
  endAddr: number,
  opcodes: any,
  FLOW_TERMINATORS: Set<string>,
  CODE_BRANCH_OPS: Set<string>,
  DATA_ACCESS_OPS: Set<string>,
  processedInThisPass: Set<number>
): boolean {
  let madeChanges = false;
  const byteCount = bytesTable.length;
  let i = startIndex;

  while (i < byteCount) {
    // Stop if we hit a byte that's not part of this instruction sequence
    // (e.g., we branched into middle of an instruction)
    if (processedInThisPass.has(i)) {
      break;
    }

    // Mark as processed
    processedInThisPass.add(i);

    const byteHex = bytesTable[i].byte;
    const opcode = opcodes[byteHex];

    // Invalid opcode - stop walking
    if (!opcode) {
      break;
    }

    // Mark this byte as code if not already marked
    if (!bytesTable[i].code) {
      bytesTable[i].code = true;
      madeChanges = true;
    }

    const instructionLength = getInstructionLength(opcode.ins);

    // Mark operand bytes as code
    for (let j = 1; j <= instructionLength && i + j < byteCount; j++) {
      processedInThisPass.add(i + j);
      if (!bytesTable[i + j].code) {
        bytesTable[i + j].code = true;
        madeChanges = true;
      }
    }

    // Calculate target address for branches/jumps
    let targetAddress: number | null = null;

    if ('rel' in opcode && i + 1 < byteCount) {
      targetAddress = getAbsFromRelative(
        bytesTable[i + 1].byte,
        startAddr + i + 2
      );
    }

    if (instructionLength === 2 && i + 2 < byteCount) {
      targetAddress = bytesToAddr(
        bytesTable[i + 2].byte,
        bytesTable[i + 1].byte
      );
    }

    // Mark branch/jump targets
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
      break; // Stop walking this section
    }

    // Move to next instruction
    i += instructionLength + 1;
  }

  return madeChanges;
}

// Helper functions (would be imported from enhancedDisassembler)

function generateByteArray(startAddr: number, bytes: Uint8Array): DisassembledByte[] {
  // Implementation from enhancedDisassembler.ts
  return [];
}

function markEntrypoints(
  bytesTable: DisassembledByte[],
  entrypoints: Entrypoint[],
  startAddr: number,
  byteCount: number
): void {
  for (const entrypoint of entrypoints) {
    const index = entrypoint.address - startAddr;
    if (index >= 0 && index < byteCount) {
      bytesTable[index].dest = true;
      if (entrypoint.type === 'code') {
        bytesTable[index].code = true;
        bytesTable[index].data = false;
      } else {
        bytesTable[index].data = true;
        bytesTable[index].code = false;
      }
    }
  }
}

function getInstructionLength(opcode: string): number {
  let length = 0;
  if (opcode.includes('hh')) length += 1;
  if (opcode.includes('ll')) length += 1;
  return length;
}

function getAbsFromRelative(offset: string, pcAfterBranch: number): number {
  const offsetValue = parseInt(offset, 16);
  if (offsetValue > 127) {
    return pcAfterBranch - (256 - offsetValue);
  } else {
    return pcAfterBranch + offsetValue;
  }
}

function bytesToAddr(hh: string, ll: string): number {
  return (parseInt(hh, 16) << 8) + parseInt(ll, 16);
}

function addrInProgram(addr: number, startAddr: number, endAddr: number): boolean {
  return addr >= startAddr && addr < endAddr;
}

function processCodeSection(
  bytesTable: DisassembledByte[],
  i: number,
  opcode: any,
  byteHex: string,
  startAddr: number,
  endAddr: number,
  FLOW_TERMINATORS: Set<string>,
  CODE_BRANCH_OPS: Set<string>,
  DATA_ACCESS_OPS: Set<string>
): { inCodeSection: boolean; nextIndex: number } {
  // Simplified placeholder
  return { inCodeSection: true, nextIndex: i };
}

/**
 * COMPARISON: Test Case
 *
 * This shows how single-pass vs multi-pass handles forward jumps
 */

// Test program: Jump forward over data
const testBytes = new Uint8Array([
  0x4C, 0x06, 0x10,  // $1000: JMP $1006
  0x01, 0x02, 0x03,  // $1003: Data bytes
  0xA9, 0x42,        // $1006: LDA #$42
  0x60               // $1008: RTS
]);

const testEntrypoints: Entrypoint[] = [
  { address: 0x1000, type: 'code', label: 'start' }
];

/*
SINGLE-PASS RESULT:
  $1000-$1002: CODE (JMP) ✓
  $1003-$1005: DATA ✓
  $1006-$1008: CODE (marked by JMP target) ✓

MULTI-PASS RESULT:
  Same as single-pass ✓

This case works in both!
*/

// Test program: Forward branch that rejoins
const testBytes2 = new Uint8Array([
  0xA9, 0x01,        // $1000: LDA #$01
  0xF0, 0x03,        // $1002: BEQ $1007 (skip 3 bytes)
  0xA9, 0x02,        // $1004: LDA #$02
  0xEA,              // $1006: NOP
  0x60               // $1007: RTS
]);

const testEntrypoints2: Entrypoint[] = [
  { address: 0x1000, type: 'code', label: 'start' }
];

/*
SINGLE-PASS RESULT:
  $1000-$1001: CODE (LDA) ✓
  $1002-$1003: CODE (BEQ, marks $1007 as dest) ✓
  $1004-$1005: CODE (LDA, sequential) ✓
  $1006: CODE (NOP, sequential) ✓
  $1007: CODE (RTS, was marked as dest) ✓

Works in single-pass because BEQ is sequential!
*/

// Test program: Two entry points converging
const testBytes3 = new Uint8Array([
  0x4C, 0x10, 0x10,  // $1000: JMP $1010 (entry 1)
  0x01, 0x02, 0x03,  // $1003: Data
  0x01, 0x02, 0x03,  // $1006: Data
  0x01, 0x02, 0x03,  // $1009: Data
  0x01, 0x02, 0x03,  // $100C: Data
  0x01,              // $100F: Data
  0xA9, 0x42,        // $1010: LDA #$42 (shared target)
  0x60               // $1012: RTS
]);

// User FIRST adds only entry point 1
const testEntrypoints3a: Entrypoint[] = [
  { address: 0x1000, type: 'code', label: 'start' }
];

// LATER adds entry point 2
const testEntrypoints3b: Entrypoint[] = [
  { address: 0x1000, type: 'code', label: 'start' },
  { address: 0x1006, type: 'code', label: 'alternate' }  // NEW!
];

/*
SINGLE-PASS with testEntrypoints3a:
  $1000-$1002: CODE ✓
  $1003-$100F: DATA ✓
  $1010-$1012: CODE ✓

  If user adds $1006 as entry point:
  - Need to re-run entire analyze()
  - No incremental update

MULTI-PASS with testEntrypoints3a:
  Pass 1: Same as single-pass
  Pass 2: No changes (all reachable code found)

  When $1006 added:
  Pass 1: Mark $1006 as entry
  Pass 2: Walk from $1006 → $1007 → $1008 → ... → $100F
  Pass 3: No changes

  But wait - $1006 is in middle of data section!
  This actually reveals bad entry point placement.
*/

/**
 * KEY INSIGHT:
 *
 * Multi-pass is most useful when:
 * 1. Entry points are added dynamically by user
 * 2. There are forward jumps creating "code islands"
 * 3. Complex control flow needs multiple iterations
 *
 * Multi-pass does NOT magically solve:
 * 1. Jump tables (computed addresses)
 * 2. Self-modifying code
 * 3. Bad entry point placement
 *
 * For most 6502 programs, single-pass is sufficient!
 * Multi-pass adds safety for edge cases.
 */
