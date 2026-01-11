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

function numberToHexByte(num: number): string {
  return num.toString(16).padStart(2, '0');
}

function numberToHexWord(num: number): string {
  return num.toString(16).padStart(4, '0');
}

function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}

function bytesToAddr(hh: string, ll: string): number {
  return (parseInt(hh, 16) << 8) + parseInt(ll, 16);
}

function addrInProgram(addr: number, startAddr: number, endAddr: number): boolean {
  return addr >= startAddr && addr < endAddr;
}

function getAbsFromRelative(byte: string, addr: number): number {
  const intByte = hexToNumber(byte);

  if (intByte > 127) {
    // subtract (255 - highbyte) from current address
    return addr - (255 - intByte);
  } else {
    // add highbyte to current address
    return addr + intByte + 1;
  }
}

function getInstructionLength(opcode: string): number {
  let length = 0;
  if (opcode.includes('hh')) length += 1;
  if (opcode.includes('ll')) length += 1;
  return length;
}

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
 */
export function analyze(
  startAddr: number,
  bytes: Uint8Array,
  entrypoints: Entrypoint[]
): DisassembledByte[] {
  const bytesTable = generateByteArray(startAddr, bytes);

  // JMP RTS RTI - used to default back to data for following instructions
  const defaultToDataAfter = ['4c', '60', '40'];

  // JMP JSR - used to identify code sections
  const absBranchMnemonics = ['4c', '20'];

  // LDA STA - used to identify data sections
  const absAddressMnemonics = [
    '0d', '0e',
    '19', '1d', '1e',
    '2d', '2e',
    '39', '3d', '3e',
    '4d', '4e',
    '59', '5d', '5e',
    '6d', '6e',
    '79', '7d', '7e',
    '8c', '8d', '8e',
    '99', '9d',
    'ac', 'ad', 'ae',
    'b9', 'bc', 'bd', 'be',
    'cc', 'cd', 'ce',
    'd9', 'dd', 'de',
    'ec', 'ee', 'ed',
    'f9', 'fd', 'fe'
  ];

  let isCode = false;
  let isData = true;
  const end = bytesTable.length;

  // Add all entrypoints before analyzing
  if (entrypoints && entrypoints.length > 0) {
    for (const entrypoint of entrypoints) {
      const tablePos = entrypoint.address - startAddr;
      if (tablePos >= 0 && tablePos < end) {
        bytesTable[tablePos].dest = true;

        if (entrypoint.type === 'code') {
          bytesTable[tablePos].code = true;
          bytesTable[tablePos].data = false;
        } else {
          bytesTable[tablePos].data = true;
          bytesTable[tablePos].code = false;
        }
      }
    }
  }

  let i = 0;
  while (i < end) {
    const byte = bytesTable[i].byte;
    const opcode = opcodes[byte as keyof typeof opcodes];

    if (!opcode) {
      i++;
      continue;
    }

    if (bytesTable[i].data) {
      isData = true;
    }

    if (bytesTable[i].code) {
      isCode = true;
    }

    if (isCode) {
      bytesTable[i].code = true;

      const instructionLength = getInstructionLength(opcode.ins);

      if (defaultToDataAfter.includes(byte)) {
        isCode = false;
      }

      let destinationAddress = 0;

      if ('rel' in opcode && i + 1 < end) {
        destinationAddress = getAbsFromRelative(bytesTable[i + 1].byte, startAddr + i + 1);
      }

      if (instructionLength === 2 && i + 2 < end) {
        destinationAddress = bytesToAddr(bytesTable[i + 2].byte, bytesTable[i + 1].byte);
      }

      if (absBranchMnemonics.includes(byte) || 'rel' in opcode) {
        if (addrInProgram(destinationAddress, startAddr, startAddr + end)) {
          const tablePos = destinationAddress - startAddr;
          bytesTable[tablePos].code = true;
          bytesTable[tablePos].dest = true;
        }
      }

      if (absAddressMnemonics.includes(byte)) {
        if (addrInProgram(destinationAddress, startAddr, startAddr + end)) {
          const tablePos = destinationAddress - startAddr;
          bytesTable[tablePos].data = true;
          bytesTable[tablePos].dest = true;
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

    // CODE
    if (byteData.code) {
      const opcode = opcodes[byte as keyof typeof opcodes];

      // Invalid opcode - treat as data
      if (!opcode) {
        const { line, nextIndex } = createDataLine(byteArray, i, label, end, pseudoOpcodePrefix);
        program.push(line);
        i = nextIndex;
        continue;
      }

      let instruction = opcode.ins;
      const length = getInstructionLength(instruction);
      const instructionBytes: number[] = [hexToNumber(byte)];

      // TWO BYTE INSTRUCTION
      if (length === 1 && i + 1 < end) {
        i++;
        const highByte = byteArray[i].byte;
        instructionBytes.push(hexToNumber(highByte));

        if ('rel' in opcode) {
          const address = numberToHexWord(getAbsFromRelative(highByte, startAddr + i));
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
    }

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
