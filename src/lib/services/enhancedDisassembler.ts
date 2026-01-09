/**
 * Enhanced Disassembler
 * Converts 6502 machine code into assembly with entrypoint support
 * Based on disass.py logic
 */

import type { Entrypoint } from '$lib/stores/entrypoints';

// Load opcodes dynamically to avoid Vite build issues
let opcodes: Record<string, { ins: string; ill?: number; rel?: number }> = {};
let opcodesLoaded = false;

async function loadOpcodes() {
  if (opcodesLoaded) return;

  const response = await fetch('/json/opcodes.json');
  opcodes = await response.json();
  opcodesLoaded = true;
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
 * Convert analyzed bytes to assembly program
 */
export function convertToProgram(
  byteArray: DisassembledByte[],
  startAddr: number
): DisassembledLine[] {
  const program: DisassembledLine[] = [];
  const labelPrefix = 'l';
  const end = byteArray.length;
  const endAddr = startAddr + end;

  let i = 0;
  while (i < end) {
    const byteData = byteArray[i];
    const byte = byteData.byte;
    let label: string | undefined;
    let instruction: string;
    const instructionBytes: number[] = [hexToNumber(byte)];

    // Add label if this is a destination
    if (byteData.dest) {
      label = labelPrefix + numberToHexWord(byteData.addr);
    }

    // DATA - Group consecutive data bytes
    if (!byteData.code || byteData.data) {
      const dataBytes: string[] = [byte];
      const allBytes: number[] = [hexToNumber(byte)];
      const dataAddress = byteData.addr;
      const MAX_BYTES_PER_LINE = 8; // Limit to prevent line wrapping in UI

      // Look ahead to group consecutive data bytes (but stop at labels/destinations)
      let j = i + 1;
      while (j < end && dataBytes.length < MAX_BYTES_PER_LINE) {
        const nextByte = byteArray[j];
        // Stop if next byte is a destination (has a label) or is code
        if (nextByte.dest || nextByte.code) {
          break;
        }
        dataBytes.push(nextByte.byte);
        allBytes.push(hexToNumber(nextByte.byte));
        j++;
      }

      // Format as ACME syntax: !byte $xx, $yy, $zz
      instruction = '!byte $' + dataBytes.join(', $');
      program.push({
        address: dataAddress,
        label,
        instruction,
        bytes: allBytes,
        isData: true
      });
      i = j;
      continue;
    }

    // CODE
    if (byteData.code) {
      const opcode = opcodes[byte as keyof typeof opcodes];

      if (!opcode) {
        // Invalid opcode, treat as data
        instruction = '!byte $' + byte;
        program.push({
          address: byteData.addr,
          label,
          instruction,
          bytes: instructionBytes,
          isData: true
        });
        i++;
        continue;
      }

      let ins = opcode.ins;
      const length = getInstructionLength(ins);

      // TWO BYTE INSTRUCTION
      if (length === 1 && i + 1 < end) {
        i++;
        const highByte = byteArray[i].byte;
        instructionBytes.push(hexToNumber(highByte));
        const intByte = hexToNumber(highByte);

        if ('rel' in opcode) {
          const address = numberToHexWord(getAbsFromRelative(highByte, startAddr + i));
          ins = ins.replace('$hh', labelPrefix + address);
        } else {
          ins = ins.replace('hh', numberToHexByte(intByte));
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
        ins = ins.replace('hh', highByte);
        ins = ins.replace('ll', lowByte);
        const addr = bytesToAddr(highByte, lowByte);

        // Turn absolute address into label if it's within the program
        if (addrInProgram(addr, startAddr, endAddr)) {
          ins = ins.replace('$', labelPrefix);
        }
      }

      instruction = ins;
      program.push({
        address: byteData.addr,
        label,
        instruction,
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
  // Load opcodes first
  await loadOpcodes();

  // Analyze bytes to determine code/data regions
  const byteArray = analyze(startAddress, bytes, entrypoints);

  // Convert to assembly program
  const program = convertToProgram(byteArray, startAddress);

  return program;
}
