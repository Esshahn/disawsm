/**
 * Enhanced Disassembler
 * Converts 6502 machine code into assembly with entrypoint support
 */

import type { Entrypoint } from '$lib/stores/entrypoints';
import type { CustomLabel } from '$lib/stores/labels';
import type { CustomComment } from '$lib/stores/comments';
import type { AssemblerSyntax } from '$lib/types';
import { get } from 'svelte/store';
import { settings } from '$lib/stores/settings';

type AddressingMode =
  | 'imp' // Implied (no operand)
  | 'acc' // Accumulator
  | 'imm' // Immediate #$hh
  | 'zp' // Zero page $hh
  | 'zpx' // Zero page,X $hh,x
  | 'zpy' // Zero page,Y $hh,y
  | 'abs' // Absolute $hhll
  | 'abx' // Absolute,X $hhll,x
  | 'aby' // Absolute,Y $hhll,y
  | 'ind' // Indirect ($hhll)
  | 'izx' // Indexed indirect ($hh,x)
  | 'izy'; // Indirect indexed ($hh),y

type FlowType = 'call' | 'jump' | 'return' | 'branch';

interface OpcodeInfo {
  ins: string;
  len: number;
  mode: AddressingMode;
  cycles: number;
  flow?: FlowType;
  ill?: number;
}

let opcodes: Record<string, OpcodeInfo> = {};
let opcodesLoaded = false;

let c64Mapping: Map<number, string> = new Map();
let mappingLoaded = false;

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
  for (const entry of data.mapping) {
    c64Mapping.set(parseInt(entry.addr, 16), entry.comm);
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
  return syntaxDefinitions[syntaxKey] || syntaxDefinitions['acme'];
}

function getC64Comment(address: number): string | undefined {
  return c64Mapping.get(address);
}

export interface DisassembledByte {
  addr: number;
  byte: string;
  dest: boolean;
  code: boolean;
  data: boolean;
}

export interface DisassembledLine {
  address: number;
  label?: string;
  instruction: string;
  comment?: string;
  bytes: number[];
  isData?: boolean;
}

const Hex = {
  toByte: (n: number) => n.toString(16).padStart(2, '0'),
  toWord: (n: number) => n.toString(16).padStart(4, '0'),
  toNumber: (h: string) => parseInt(h, 16),
  bytesToAddress: (hh: string, ll: string) =>
    (parseInt(hh, 16) << 8) | parseInt(ll, 16)
};

function addrInProgram(addr: number, start: number, end: number) {
  return addr >= start && addr < end;
}

function getAbsFromRelative(offset: string, pcAfter: number): number {
  const v = Hex.toNumber(offset);
  return v > 127 ? pcAfter - (256 - v) : pcAfter + v;
}

function generateByteArray(start: number, bytes: Uint8Array): DisassembledByte[] {
  return Array.from(bytes, (b, i) => ({
    addr: start + i,
    byte: Hex.toByte(b),
    dest: false,
    code: false,
    data: false
  }));
}

/**
 * ANALYSIS (REFACTORED)
 * - Uses metadata from opcodes.json (len, mode, flow)
 * - Data entrypoints block code propagation
 * - Code never flows through data
 */
export function analyze(
  startAddr: number,
  bytes: Uint8Array,
  entrypoints: Entrypoint[]
): DisassembledByte[] {
  const table = generateByteArray(startAddr, bytes);
  const endAddr = startAddr + table.length;

  const worklist: number[] = [];
  const visited = new Set<number>();

  // Seed entrypoints
  for (const ep of entrypoints || []) {
    const idx = ep.address - startAddr;
    if (idx < 0 || idx >= table.length) continue;

    table[idx].dest = true;

    if (ep.type === 'code') {
      table[idx].code = true;
      worklist.push(idx);
    } else {
      table[idx].data = true;
    }
  }

  while (worklist.length > 0) {
    const pc = worklist.pop()!;
    if (visited.has(pc)) continue;
    visited.add(pc);

    const byte = table[pc];

    // 🚫 Data blocks code
    if (byte.data) continue;

    const opcode = opcodes[byte.byte];
    if (!opcode || opcode.ill) continue;

    byte.code = true;

    // ✅ Use metadata: direct property access
    const len = opcode.len;

    // Mark operand bytes as code unless already data
    for (let i = 1; i < len; i++) {
      if (pc + i < table.length && !table[pc + i].data) {
        table[pc + i].code = true;
      }
    }

    // Extract target address for control flow tracking
    let targetAddr: number | null = null;

    if (opcode.flow === 'branch' && pc + 1 < table.length) {
      // Branch instructions (relative addressing)
      targetAddr = getAbsFromRelative(table[pc + 1].byte, startAddr + pc + len);
    } else if ((opcode.mode === 'abs' || opcode.mode === 'abx' || opcode.mode === 'aby') && pc + 2 < table.length) {
      // Absolute addressing (JMP, JSR, or memory operations)
      targetAddr = Hex.bytesToAddress(table[pc + 2].byte, table[pc + 1].byte);
    }

    // Mark branch/jump targets
    if (targetAddr !== null && addrInProgram(targetAddr, startAddr, endAddr)) {
      const ti = targetAddr - startAddr;
      if (!table[ti].data) {
        table[ti].dest = true;
        table[ti].code = true;
        worklist.push(ti);
      }
    }

    const next = pc + len;

    // ✅ Use flow metadata instead of hardcoded opcodes
    if (opcode.flow === 'call') {
      // JSR: follow fall-through after subroutine call
      if (next < table.length && !table[next].data) {
        worklist.push(next);
      }
    } else if (opcode.flow !== 'jump' && opcode.flow !== 'return') {
      // Normal fall-through (not JMP, RTS, RTI)
      if (next < table.length && !table[next].data) {
        worklist.push(next);
      }
    }
  }

  return table;
}

/* ---------------- CONVERSION PASS (UNCHANGED) ---------------- */

function createDataLine(
  byteArray: DisassembledByte[],
  startIndex: number,
  label: string | undefined,
  end: number,
  pseudo: string,
  commentsMap: Map<number, string>
) {
  const bytes: string[] = [];
  const nums: number[] = [];
  let i = startIndex;

  while (i < end && bytes.length < 8) {
    const b = byteArray[i];
    if (i !== startIndex && (b.dest || b.code)) break;
    bytes.push(b.byte);
    nums.push(Hex.toNumber(b.byte));
    i++;
  }

  const address = byteArray[startIndex].addr;
  const comment = commentsMap.get(address);

  return {
    line: {
      address,
      label,
      instruction: `${pseudo}byte $${bytes.join(', $')}`,
      comment,
      bytes: nums,
      isData: true
    },
    nextIndex: i
  };
}

/**
 * Helper function to get label for an address
 * Checks custom labels first, then falls back to auto-generated label
 */
function getLabel(address: number, customLabels: CustomLabel[], labelPrefix: string): string {
  const customLabel = customLabels.find(l => l.address === address);
  if (customLabel) {
    return customLabel.name;
  }
  return labelPrefix + Hex.toWord(address);
}

/**
 * Extract absolute address from opcode and operand bytes
 * Returns null if the instruction doesn't reference an absolute address
 */
function getAbsoluteAddressFromBytes(
  byteArray: DisassembledByte[],
  startIndex: number,
  opcode: OpcodeInfo
): number | null {
  // ✅ Use metadata instead of string parsing
  if (opcode.mode === 'abs' || opcode.mode === 'abx' || opcode.mode === 'aby') {
    if (startIndex + 2 < byteArray.length) {
      const ll = byteArray[startIndex + 1].byte;
      const hh = byteArray[startIndex + 2].byte;
      return Hex.bytesToAddress(hh, ll);
    }
  }

  return null;
}

/**
 * Build a unified comments map from auto-generated C64 comments and custom comments
 * Custom comments override auto-generated ones at the same address
 */
function buildCommentsMap(
  byteArray: DisassembledByte[],
  startAddr: number,
  customComments: CustomComment[]
): Map<number, string> {
  const commentsMap = new Map<number, string>();

  // First pass: Add all auto-generated C64 comments for code instructions
  for (let i = 0; i < byteArray.length; i++) {
    const b = byteArray[i];
    if (!b.code || b.data) continue;

    const opcode = opcodes[b.byte];
    if (!opcode) continue;

    // Extract absolute address and check for C64 memory map comment
    const absAddr = getAbsoluteAddressFromBytes(byteArray, i, opcode);
    if (absAddr !== null) {
      const autoComment = getC64Comment(absAddr);
      if (autoComment) {
        commentsMap.set(b.addr, autoComment);
      }
    }
  }

  // Second pass: Add/override with custom comments (works for both code and data)
  for (const customComment of customComments) {
    commentsMap.set(customComment.address, customComment.comment);
  }

  return commentsMap;
}

export function convertToProgram(
  byteArray: DisassembledByte[],
  startAddr: number,
  pseudoOpcodePrefix = '!',
  customLabels: CustomLabel[] = [],
  customComments: CustomComment[] = []
): DisassembledLine[] {
  const program: DisassembledLine[] = [];
  const labelPrefix = get(settings).labelPrefix;
  const endAddr = startAddr + byteArray.length;

  // Build unified comments map upfront
  const commentsMap = buildCommentsMap(byteArray, startAddr, customComments);

  let i = 0;
  while (i < byteArray.length) {
    const b = byteArray[i];
    const label = b.dest ? getLabel(b.addr, customLabels, labelPrefix) : undefined;

    if (!b.code || b.data) {
      const { line, nextIndex } = createDataLine(
        byteArray,
        i,
        label,
        byteArray.length,
        pseudoOpcodePrefix,
        commentsMap
      );
      program.push(line);
      i = nextIndex;
      continue;
    }

    const opcode = opcodes[b.byte];
    if (!opcode) {
      const { line, nextIndex } = createDataLine(
        byteArray,
        i,
        label,
        byteArray.length,
        pseudoOpcodePrefix,
        commentsMap
      );
      program.push(line);
      i = nextIndex;
      continue;
    }

    let instr = opcode.ins;
    const bytes = [Hex.toNumber(b.byte)];

    // ✅ Use addressing mode for intelligent formatting
    switch (opcode.mode) {
      case 'imm': // Immediate #$hh
      case 'zp': // Zero page $hh (also used for branches)
      case 'zpx': // Zero page,X
      case 'zpy': // Zero page,Y
      case 'izx': // Indexed indirect ($hh,x)
      case 'izy': // Indirect indexed ($hh),y
        if (i + 1 < byteArray.length) {
          const operand = byteArray[++i].byte;
          bytes.push(Hex.toNumber(operand));

          // Special handling for branch instructions (relative addressing)
          if (opcode.flow === 'branch') {
            const targetAddr = getAbsFromRelative(operand, startAddr + i + 1);
            const labelName = getLabel(targetAddr, customLabels, labelPrefix);
            instr = instr.replace('$hh', labelName);
          } else {
            instr = instr.replace('hh', operand);
          }
        }
        break;

      case 'abs': // Absolute $hhll
      case 'abx': // Absolute,X
      case 'aby': // Absolute,Y
      case 'ind': // Indirect ($hhll)
        if (i + 2 < byteArray.length) {
          const ll = byteArray[++i].byte;
          const hh = byteArray[++i].byte;
          bytes.push(Hex.toNumber(ll), Hex.toNumber(hh));
          const addr = Hex.bytesToAddress(hh, ll);

          if (addrInProgram(addr, startAddr, endAddr)) {
            // Replace with label name for in-program addresses
            const labelName = getLabel(addr, customLabels, labelPrefix);
            instr = instr.replace('$hhll', labelName);
          } else {
            // Not in program, just replace with hex values
            instr = instr.replace('hh', hh).replace('ll', ll);
          }
        }
        break;

      case 'imp': // Implied (no operand)
      case 'acc': // Accumulator
        // No operands to process
        break;
    }

    // Lookup comment from unified map
    const comment = commentsMap.get(b.addr);

    program.push({
      address: b.addr,
      label,
      instruction: instr,
      comment,
      bytes
    });

    i++;
  }

  return program;
}

export async function disassembleWithEntrypoints(
  bytes: Uint8Array,
  startAddress: number,
  entrypoints: Entrypoint[],
  customLabels: CustomLabel[] = [],
  customComments: CustomComment[] = []
): Promise<DisassembledLine[]> {
  await loadOpcodes();
  await loadC64Mapping();
  await loadSyntax();

  const syntax = getSyntax();
  const analyzed = analyze(startAddress, bytes, entrypoints);
  return convertToProgram(analyzed, startAddress, syntax.pseudoOpcodePrefix, customLabels, customComments);
}
