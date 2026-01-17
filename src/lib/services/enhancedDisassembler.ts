/**
 * Enhanced Disassembler
 * Converts 6502 machine code into assembly with entrypoint support
 */

import type { Entrypoint } from '$lib/stores/entrypoints';
import type { CustomLabel } from '$lib/stores/labels';
import type { CustomComment } from '$lib/stores/comments';
import { loadSyntax, getSyntax } from '$lib/services/syntaxService';
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

function getC64Comment(address: number): string | undefined {
  return c64Mapping.get(address);
}

export interface DisassembledByte {
  addr: number;
  byte: string;
  dest: boolean;
  code: boolean;
  data: boolean;
  xrefs: number[]; // Addresses that reference this location
}

export interface DisassembledLine {
  address: number;
  label?: string;
  instruction: string;
  comment?: string;
  xrefComment?: string; // XREF comment for label lines
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
    data: false,
    xrefs: []
  }));
}

/**
 * Analyze binary to identify code vs data regions.
 * Uses worklist algorithm with metadata from opcodes.json.
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
    if (!opcode || opcode.ill) {
      // Unknown/illegal opcode: only mark as data if not an explicit entrypoint
      // (preserve user's intent when they explicitly mark something as code)
      if (!byte.dest) {
        byte.data = true;
      }
      continue;
    }

    byte.code = true;
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

    // Mark branch/jump targets and track XREFs
    if (targetAddr !== null && addrInProgram(targetAddr, startAddr, endAddr)) {
      const ti = targetAddr - startAddr;
      if (!table[ti].data) {
        table[ti].dest = true;
        table[ti].code = true;
        // Track cross-reference: source address references target
        table[ti].xrefs.push(startAddr + pc);
        worklist.push(ti);
      }
    }

    // Follow fall-through unless this is an unconditional jump or return
    const next = pc + len;
    const terminatesFlow = opcode.flow === 'jump' || opcode.flow === 'return';
    if (!terminatesFlow && next < table.length && !table[next].data) {
      worklist.push(next);
    }
  }

  return table;
}

/* ---------------- CONVERSION PASS ---------------- */

function createDataLine(
  byteArray: DisassembledByte[],
  startIndex: number,
  label: string | undefined,
  pseudo: string,
  commentsMap: Map<number, string>
): { line: DisassembledLine; nextIndex: number } {
  const hexBytes: string[] = [];
  const numBytes: number[] = [];
  let i = startIndex;

  while (i < byteArray.length && hexBytes.length < 8) {
    const b = byteArray[i];
    if (i !== startIndex && (b.dest || b.code)) break;
    hexBytes.push(b.byte);
    numBytes.push(Hex.toNumber(b.byte));
    i++;
  }

  const firstByte = byteArray[startIndex];

  return {
    line: {
      address: firstByte.addr,
      label,
      instruction: `${pseudo}byte $${hexBytes.join(', $')}`,
      comment: commentsMap.get(firstByte.addr),
      xrefComment: label ? formatXrefComment(firstByte.xrefs) : undefined,
      bytes: numBytes,
      isData: true
    },
    nextIndex: i
  };
}

/**
 * Helper function to get label for an address
 * Checks custom labels map first, then falls back to auto-generated label
 */
function getLabel(address: number, labelMap: Map<number, string>, labelPrefix: string): string {
  return labelMap.get(address) ?? labelPrefix + Hex.toWord(address);
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
 * Build a unified comments map from auto-generated C64 comments and custom comments.
 * Custom comments override auto-generated ones at the same address.
 */
function buildCommentsMap(
  byteArray: DisassembledByte[],
  customComments: CustomComment[]
): Map<number, string> {
  const commentsMap = new Map<number, string>();

  // Add auto-generated C64 comments for code instructions
  for (let i = 0; i < byteArray.length; i++) {
    const b = byteArray[i];
    if (!b.code || b.data) continue;

    const opcode = opcodes[b.byte];
    if (!opcode) continue;

    const absAddr = getAbsoluteAddressFromBytes(byteArray, i, opcode);
    if (absAddr !== null) {
      const autoComment = getC64Comment(absAddr);
      if (autoComment) {
        commentsMap.set(b.addr, autoComment);
      }
    }
  }

  // Custom comments override auto-generated
  for (const cc of customComments) {
    commentsMap.set(cc.address, cc.comment);
  }

  return commentsMap;
}

/**
 * Format XREF comment for a label line
 * Example: "XREF: $c010, $c050"
 */
function formatXrefComment(xrefs: number[]): string | undefined {
  if (xrefs.length === 0) return undefined;
  const sorted = [...xrefs].sort((a, b) => a - b);
  const formatted = sorted.map(addr => '$' + Hex.toWord(addr));
  return 'XREF: ' + formatted.join(', ');
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

  // Build maps upfront for O(1) lookups
  const labelMap = new Map(customLabels.map(l => [l.address, l.name]));
  const commentsMap = buildCommentsMap(byteArray, customComments);

  let i = 0;
  while (i < byteArray.length) {
    const b = byteArray[i];
    const label = b.dest ? getLabel(b.addr, labelMap, labelPrefix) : undefined;

    const opcode = opcodes[b.byte];

    // Handle data bytes, unknown opcodes, or illegal opcodes (unless explicitly marked as code destination)
    if (!b.code || b.data || !opcode || (opcode.ill && !b.dest)) {
      const { line, nextIndex } = createDataLine(byteArray, i, label, pseudoOpcodePrefix, commentsMap);
      program.push(line);
      i = nextIndex;
      continue;
    }

    let instr = opcode.ins;
    const bytes = [Hex.toNumber(b.byte)];

    // Format operands based on addressing mode
    switch (opcode.mode) {
      case 'imm':
      case 'zp':
      case 'zpx':
      case 'zpy':
      case 'izx':
      case 'izy':
        if (i + 1 < byteArray.length) {
          const operand = byteArray[++i].byte;
          bytes.push(Hex.toNumber(operand));

          if (opcode.flow === 'branch') {
            // Branch: use label for target
            const targetAddr = getAbsFromRelative(operand, startAddr + i + 1);
            instr = instr.replace('$hh', getLabel(targetAddr, labelMap, labelPrefix));
          } else {
            instr = instr.replace('hh', operand);
          }
        }
        break;

      case 'abs':
      case 'abx':
      case 'aby':
      case 'ind':
        if (i + 2 < byteArray.length) {
          const ll = byteArray[++i].byte;
          const hh = byteArray[++i].byte;
          bytes.push(Hex.toNumber(ll), Hex.toNumber(hh));
          const addr = Hex.bytesToAddress(hh, ll);

          if (addrInProgram(addr, startAddr, endAddr)) {
            instr = instr.replace('$hhll', getLabel(addr, labelMap, labelPrefix));
          } else {
            instr = instr.replace('hh', hh).replace('ll', ll);
          }
        }
        break;

      case 'imp':
      case 'acc':
        break;
    }

    const comment = commentsMap.get(b.addr);
    const xrefComment = label ? formatXrefComment(b.xrefs) : undefined;

    program.push({
      address: b.addr,
      label,
      instruction: instr,
      comment,
      xrefComment,
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
