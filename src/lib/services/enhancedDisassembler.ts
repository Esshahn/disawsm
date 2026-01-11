/**
 * Enhanced Disassembler
 * Converts 6502 machine code into assembly with entrypoint support
 * Based on disass.py logic
 */

import type { Entrypoint } from '$lib/stores/entrypoints';
import type { AssemblerSyntax } from '$lib/types';
import { get } from 'svelte/store';
import { settings } from '$lib/stores/settings';

// Load opcodes dynamically to avoid Vite build issues
let opcodes: Record<string, { ins: string; ill?: number; rel?: number }> = {};
let opcodesLoaded = false;

// Load C64 address mapping for comments
let c64Mapping: Map<number, string> = new Map();
let mappingLoaded = false;

// Load syntax definitions
let syntaxDefinitions: Record<string, AssemblerSyntax> = {};
let syntaxLoaded = false;

async function loadOpcodes() {
  if (opcodesLoaded) return;

  const response = await fetch('/json/opcodes.json');
  opcodes = await response.json();
  opcodesLoaded = true;
}

async function loadC64Mapping() {
  if (mappingLoaded) return;

  const response = await fetch('/json/c64-mapping.json');
  const data = await response.json();

  // Convert to Map for O(1) lookup
  for (const entry of data.mapping) {
    const addr = parseInt(entry.addr, 16);
    c64Mapping.set(addr, entry.comm);
  }

  mappingLoaded = true;
}

async function loadSyntax() {
  if (syntaxLoaded) return;

  const response = await fetch('/json/syntax.json');
  const data = await response.json();
  syntaxDefinitions = data.syntaxes;
  syntaxLoaded = true;
}

function getSyntax(): AssemblerSyntax {
  const syntaxKey = get(settings).assemblerSyntax;
  return syntaxDefinitions[syntaxKey] || syntaxDefinitions['acme'] || {
    name: 'ACME',
    commentPrefix: ';',
    labelSuffix: '',
    pseudoOpcodePrefix: '!'
  };
}

function getC64Comment(address: number): string | undefined {
  return c64Mapping.get(address);
}

export interface DisassembledByte {
  addr: number;
  byte: string;  // hex string
  dest: boolean;  // is it a destination of a jump/branch?
  code: boolean;  // is it code?
  data: boolean;  // is it data?
}

export interface DisassembledLine {
  address: number;
  label?: string;
  instruction: string;
  comment?: string;
  bytes: number[];
  isData?: boolean;  // true if this is a data section (.byte)
}

/**
 * Hex conversion utilities
 * Handles conversion between numbers and hex strings for 6502 assembly
 */
const Hex = {
  /** Convert number to 2-digit hex string (e.g., 255 → "ff") */
  toByte: (num: number): string => num.toString(16).padStart(2, '0'),

  /** Convert number to 4-digit hex string (e.g., 4096 → "1000") */
  toWord: (num: number): string => num.toString(16).padStart(4, '0'),

  /** Convert hex string to number (e.g., "ff" → 255) */
  toNumber: (hex: string): number => parseInt(hex, 16),

  /** Convert little-endian bytes to 16-bit address (e.g., "00", "10" → 4096) */
  bytesToAddress: (highByte: string, lowByte: string): number =>
    (parseInt(highByte, 16) << 8) + parseInt(lowByte, 16)
};

// Legacy function names for backward compatibility
function numberToHexByte(num: number): string {
  return Hex.toByte(num);
}

function numberToHexWord(num: number): string {
  return Hex.toWord(num);
}

function hexToNumber(hex: string): number {
  return Hex.toNumber(hex);
}

function bytesToAddr(hh: string, ll: string): number {
  return Hex.bytesToAddress(hh, ll);
}

function addrInProgram(addr: number, startAddr: number, endAddr: number): boolean {
  return addr >= startAddr && addr < endAddr;
}

/**
 * Calculate absolute address from relative branch offset
 * @param offset - The offset byte (signed -128 to +127)
 * @param pcAfterBranch - Program counter AFTER the 2-byte branch instruction
 * @returns Absolute target address
 */
function getAbsFromRelative(offset: string, pcAfterBranch: number): number {
  const offsetValue = hexToNumber(offset);

  if (offsetValue > 127) {
    // Negative offset: treat as signed byte (two's complement)
    return pcAfterBranch - (256 - offsetValue);
  } else {
    // Positive offset
    return pcAfterBranch + offsetValue;
  }
}

function getInstructionLength(opcode: string): number {
  let length = 0;
  if (opcode.includes('hh')) length += 1;
  if (opcode.includes('ll')) length += 1;
  return length;
}

// Opcode Categories for Analysis
// These categorize 6502 opcodes by their behavior to help distinguish code from data

/** Opcodes that terminate code flow (no fall-through to next instruction) */
const FLOW_TERMINATORS = new Set([
  '4c', // JMP absolute
  '60', // RTS
  '40'  // RTI
]);

/** Opcodes that branch/jump to code locations */
const CODE_BRANCH_OPS = new Set([
  '4c', // JMP absolute
  '20'  // JSR absolute
]);

/**
 * Opcodes with absolute addressing that likely access data (not code)
 * Includes: ORA, ASL, AND, BIT, EOR, LSR, ADC, ROR, STA, STY, STX,
 * LDA, LDY, LDX, CMP, CPY, CPX, DEC, INC, SBC
 */
const DATA_ACCESS_OPS = new Set([
  '0d', '0e', // ORA abs, ASL abs
  '19', '1d', '1e', // ORA abs,Y / ORA abs,X / ASL abs,X
  '2d', '2e', // AND abs, ROL abs
  '39', '3d', '3e', // AND abs,Y / AND abs,X / ROL abs,X
  '4d', '4e', // EOR abs, LSR abs
  '59', '5d', '5e', // EOR abs,Y / EOR abs,X / LSR abs,X
  '6d', '6e', // ADC abs, ROR abs
  '79', '7d', '7e', // ADC abs,Y / ADC abs,X / ROR abs,X
  '8c', '8d', '8e', // STY abs, STA abs, STX abs
  '99', '9d', // STA abs,Y / STA abs,X
  'ac', 'ad', 'ae', // LDY abs, LDA abs, LDX abs
  'b9', 'bc', 'bd', 'be', // LDA abs,Y / LDY abs,X / LDA abs,X / LDX abs,Y
  'cc', 'cd', 'ce', // CPY abs, CMP abs, DEC abs
  'd9', 'dd', 'de', // CMP abs,Y / CMP abs,X / DEC abs,X
  'ec', 'ee', 'ed', // CPX abs, INC abs, SBC abs
  'f9', 'fd', 'fe'  // SBC abs,Y / SBC abs,X / INC abs,X
]);

function generateByteArray(startAddr: number, bytes: Uint8Array): DisassembledByte[] {
  const bytesTable: DisassembledByte[] = [];
  const end = bytes.length;

  for (let pc = 0; pc < end; pc++) {
    bytesTable.push({
      addr: startAddr + pc,
      byte: numberToHexByte(bytes[pc]),
      dest: false,
      code: false,
      data: false
    });
  }

  return bytesTable;
}

/**
 * Analyze bytes and mark code/data sections based on opcodes and entrypoints
 *
 * This is the core analysis algorithm that distinguishes between code and data.
 * It works in two phases:
 * 1. Mark all user-defined entrypoints as code or data
 * 2. Follow control flow from code sections, marking reachable bytes as code
 *
 * Algorithm:
 * - Starts assuming all bytes are data (conservative approach)
 * - Entrypoints "seed" the analysis by explicitly marking addresses
 * - For code sections: follows jumps/branches to discover more code
 * - For data sections: marks load/store targets as data
 * - Terminates code sections at JMP/RTS/RTI instructions
 *
 * @param startAddr - Starting address of the program in memory
 * @param bytes - Raw bytes to disassemble
 * @param entrypoints - User-defined code/data entry points
 * @returns Array of analyzed bytes with code/data/dest flags set
 */
export function analyze(
  startAddr: number,
  bytes: Uint8Array,
  entrypoints: Entrypoint[]
): DisassembledByte[] {
  const bytesTable = generateByteArray(startAddr, bytes);
  const byteCount = bytesTable.length;
  const endAddr = startAddr + byteCount;

  // Phase 1: Mark all user-defined entrypoints
  if (entrypoints && entrypoints.length > 0) {
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

  // Phase 2: Propagate code/data markings by following control flow
  // State machine: are we currently processing code?
  let inCodeSection = false;

  let i = 0;
  while (i < byteCount) {
    const byteHex = bytesTable[i].byte;
    const opcode = opcodes[byteHex as keyof typeof opcodes];

    // Check if current byte switches our mode
    if (bytesTable[i].code) {
      inCodeSection = true;
    } else if (bytesTable[i].data) {
      inCodeSection = false;
    }

    // If no valid opcode, skip this byte
    // If we're in code section, this should exit code mode
    if (!opcode) {
      if (inCodeSection) {
        inCodeSection = false;
      }
      i++;
      continue;
    }

    if (inCodeSection) {
      // Mark the opcode byte as code
      bytesTable[i].code = true;

      const instructionLength = getInstructionLength(opcode.ins);

      // Mark all operand bytes as code too
      for (let j = 1; j <= instructionLength && i + j < byteCount; j++) {
        bytesTable[i + j].code = true;
      }

      // Check if this instruction terminates code flow
      if (FLOW_TERMINATORS.has(byteHex)) {
        inCodeSection = false;
      }

      let targetAddress: number | null = null;

      // Calculate target address for branch/jump instructions
      if ('rel' in opcode && i + 1 < byteCount) {
        targetAddress = getAbsFromRelative(bytesTable[i + 1].byte, startAddr + i + 2);
      }

      if (instructionLength === 2 && i + 2 < byteCount) {
        targetAddress = bytesToAddr(bytesTable[i + 2].byte, bytesTable[i + 1].byte);
      }

      // Mark target bytes based on instruction type
      if (targetAddress !== null) {
        // Branches and jumps point to code
        if (CODE_BRANCH_OPS.has(byteHex) || 'rel' in opcode) {
          if (addrInProgram(targetAddress, startAddr, endAddr)) {
            const targetIndex = targetAddress - startAddr;
            bytesTable[targetIndex].code = true;
            bytesTable[targetIndex].dest = true;
          }
        }

        // Load/store operations point to data
        if (DATA_ACCESS_OPS.has(byteHex)) {
          if (addrInProgram(targetAddress, startAddr, endAddr)) {
            const targetIndex = targetAddress - startAddr;
            bytesTable[targetIndex].data = true;
            bytesTable[targetIndex].dest = true;
          }
        }
      }

      i += instructionLength;
    }

    i++;
  }

  return bytesTable;
}

/**
 * Helper: Create a grouped data line from consecutive bytes
 */
function createDataLine(
  byteArray: DisassembledByte[],
  startIndex: number,
  label: string | undefined,
  end: number,
  pseudoOpcodePrefix: string
): { line: DisassembledLine; nextIndex: number } {
  const MAX_BYTES_PER_LINE = 8; // Limit to prevent line wrapping in UI
  const dataBytes: string[] = [byteArray[startIndex].byte];
  const allBytes: number[] = [hexToNumber(byteArray[startIndex].byte)];
  const dataAddress = byteArray[startIndex].addr;

  // Look ahead to group consecutive data bytes (but stop at labels/destinations)
  let j = startIndex + 1;
  while (j < end && dataBytes.length < MAX_BYTES_PER_LINE) {
    const nextByte = byteArray[j];
    if (nextByte.dest || nextByte.code) break;
    dataBytes.push(nextByte.byte);
    allBytes.push(hexToNumber(nextByte.byte));
    j++;
  }

  return {
    line: {
      address: dataAddress,
      label,
      instruction: pseudoOpcodePrefix + 'byte $' + dataBytes.join(', $'),
      bytes: allBytes,
      isData: true
    },
    nextIndex: j
  };
}

/**
 * Extract absolute address from instruction if present
 */
function extractAbsoluteAddress(instruction: string): number | null {
  // Match $xxxx pattern (4-digit hex address)
  const match = instruction.match(/\$([0-9a-f]{4})/i);
  if (match) {
    return parseInt(match[1], 16);
  }
  return null;
}

/**
 * Convert analyzed bytes to assembly program
 *
 * Takes the output from analyze() and generates human-readable assembly code.
 * - Code bytes become instructions (LDA, STA, JMP, etc.)
 * - Data bytes become .byte directives
 * - Branch/jump destinations get labels (e.g., L1000)
 * - Known C64 addresses get comments (e.g., $D020 ; BORDER COLOR)
 *
 * @param byteArray - Analyzed bytes from analyze() function
 * @param startAddr - Starting address of the program
 * @param pseudoOpcodePrefix - Prefix for assembler directives (e.g., '!' for ACME)
 * @returns Array of disassembled lines ready for display
 */
export function convertToProgram(
  byteArray: DisassembledByte[],
  startAddr: number,
  pseudoOpcodePrefix: string = '!'
): DisassembledLine[] {
  const program: DisassembledLine[] = [];
  const labelPrefix = get(settings).labelPrefix;
  const end = byteArray.length;
  const endAddr = startAddr + end;

  let i = 0;
  while (i < end) {
    const byteData = byteArray[i];
    const byte = byteData.byte;
    const label = byteData.dest ? labelPrefix + numberToHexWord(byteData.addr) : undefined;

    // DATA - Group consecutive data bytes or handle invalid opcodes
    if (!byteData.code || byteData.data) {
      const { line, nextIndex } = createDataLine(byteArray, i, label, end, pseudoOpcodePrefix);
      program.push(line);
      i = nextIndex;
      continue;
    }

    // CODE - Process as instruction
    const opcode = opcodes[byte as keyof typeof opcodes];

    // Invalid opcode - treat as data
    if (!opcode) {
      const { line, nextIndex } = createDataLine(byteArray, i, label, end, pseudoOpcodePrefix);
      program.push(line);
      i = nextIndex;
      continue;
    }

    // Decode instruction
    let instruction = opcode.ins;
    const length = getInstructionLength(instruction);
    const instructionBytes: number[] = [hexToNumber(byte)];

    // TWO BYTE INSTRUCTION
    if (length === 1 && i + 1 < end) {
      i++;
      const highByte = byteArray[i].byte;
      instructionBytes.push(hexToNumber(highByte));

      if ('rel' in opcode) {
        const address = numberToHexWord(getAbsFromRelative(highByte, startAddr + i + 1));
        instruction = instruction.replace('$hh', labelPrefix + address);
      } else {
        instruction = instruction.replace('hh', numberToHexByte(hexToNumber(highByte)));
      }
    }

    // THREE BYTE INSTRUCTION
    if (length === 2 && i + 2 < end) {
      i++;
      const lowByte = byteArray[i].byte;
      instructionBytes.push(hexToNumber(lowByte));
      i++;
      const highByte = byteArray[i].byte;
      instructionBytes.push(hexToNumber(highByte));
      instruction = instruction.replace('hh', highByte).replace('ll', lowByte);
      const addr = bytesToAddr(highByte, lowByte);

      // Turn absolute address into label if it's within the program
      if (addrInProgram(addr, startAddr, endAddr)) {
        instruction = instruction.replace('$', labelPrefix);
      }
    }

    // Extract C64 comment if instruction references a known address
    let comment: string | undefined;
    const absAddr = extractAbsoluteAddress(instruction);
    if (absAddr !== null) {
      comment = getC64Comment(absAddr);
    }

    program.push({
      address: byteData.addr,
      label,
      instruction,
      comment,
      bytes: instructionBytes
    });

    i++;
  }

  return program;
}

/**
 * Main disassemble function
 */
export async function disassembleWithEntrypoints(
  bytes: Uint8Array,
  startAddress: number,
  entrypoints: Entrypoint[]
): Promise<DisassembledLine[]> {
  // Load opcodes, C64 mapping, and syntax
  await loadOpcodes();
  await loadC64Mapping();
  await loadSyntax();

  // Get current syntax settings
  const syntax = getSyntax();

  // Analyze bytes to determine code/data regions
  const byteArray = analyze(startAddress, bytes, entrypoints);

  // Convert to assembly program with syntax-specific pseudo-opcode prefix
  const program = convertToProgram(byteArray, startAddress, syntax.pseudoOpcodePrefix);

  return program;
}
