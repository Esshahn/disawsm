/**
 * Enhanced Disassembler
 * Converts 6502 machine code into assembly with entrypoint support
 */

import type { Entrypoint } from '$lib/stores/entrypoints';
import type { CustomLabel } from '$lib/stores/labels';
import type { CustomComment } from '$lib/stores/comments';
import { loadSyntax, getSyntax } from '$lib/services/syntaxService';
import { loadPatterns, findPatternMatches } from '$lib/services/patternService';
import { get } from 'svelte/store';
import { settings } from '$lib/stores/settings';

type AddressingMode =
  | 'imp' | 'acc' | 'imm' | 'zp' | 'zpx' | 'zpy'
  | 'abs' | 'abx' | 'aby' | 'ind' | 'izx' | 'izy';

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

/* ================== TYPES ================== */

// Single source of truth for byte classification
type ByteState = 'unknown' | 'code' | 'data';

export interface DisassembledByte {
  addr: number;
  byte: number;           // Raw byte value (formatted on output)
  state: ByteState;       // Single state - no conflicting flags
  isTarget: boolean;      // Is this a jump/branch/call target? (for labels)
  userMarked: boolean;    // Was this explicitly set by user entrypoint?
  xrefs: number[];        // Addresses that reference this location
}

export interface DisassembledLine {
  address: number;
  label?: string;
  instruction: string;
  comment?: string;
  xrefComment?: string;
  bytes: number[];
  isData?: boolean;
}

/* ================== HELPERS ================== */

const Hex = {
  toByte: (n: number) => n.toString(16).padStart(2, '0'),
  toWord: (n: number) => n.toString(16).padStart(4, '0'),
  fromByte: (b: number, offset: number) => ((b >> (offset * 8)) & 0xff),
  address: (lo: number, hi: number) => (hi << 8) | lo
};

function inRange(addr: number, start: number, end: number): boolean {
  return addr >= start && addr < end;
}

function relativeToAbsolute(offset: number, pcAfter: number): number {
  return offset > 127 ? pcAfter - (256 - offset) : pcAfter + offset;
}

function generateByteArray(start: number, bytes: Uint8Array): DisassembledByte[] {
  return Array.from(bytes, (b, i) => ({
    addr: start + i,
    byte: b,
    state: 'unknown',
    isTarget: false,
    userMarked: false,
    xrefs: []
  }));
}

/* ================== ANALYSIS PASS ================== */

/**
 * Analyze binary to identify code vs data regions.
 * Priority: user entrypoints > pattern matches > flow analysis
 */
export function analyze(
  startAddr: number,
  bytes: Uint8Array,
  entrypoints: Entrypoint[],
  usePatternMatching: boolean = true
): DisassembledByte[] {
  const table = generateByteArray(startAddr, bytes);
  const endAddr = startAddr + table.length;
  const worklist: number[] = [];
  const visited = new Set<number>();

  // 1. Process user entrypoints (highest priority)
  for (const ep of entrypoints || []) {
    const idx = ep.address - startAddr;
    if (idx < 0 || idx >= table.length) continue;

    table[idx].isTarget = true;
    table[idx].userMarked = true;

    if (ep.type === 'code') {
      table[idx].state = 'code';
      worklist.push(idx);
    } else {
      table[idx].state = 'data';
    }
  }

  // 2. Pattern matching (only for unknown bytes)
  if (usePatternMatching) {
    for (const idx of findPatternMatches(bytes)) {
      if (table[idx].state === 'unknown') {
        table[idx].state = 'code';
        worklist.push(idx);
      }
    }
  }

  // 3. Worklist-driven flow analysis
  while (worklist.length > 0) {
    const pc = worklist.pop()!;
    if (visited.has(pc)) continue;
    visited.add(pc);

    const entry = table[pc];

    // Data blocks code propagation
    if (entry.state === 'data') continue;

    const opcodeHex = Hex.toByte(entry.byte);
    const opcode = opcodes[opcodeHex];

    // Invalid/illegal opcode: mark as data (unless user explicitly marked as code)
    if (!opcode || opcode.ill) {
      if (!entry.userMarked) {
        entry.state = 'data';
      }
      continue;
    }

    // Valid opcode: mark as code
    entry.state = 'code';
    const len = opcode.len;

    // Mark operand bytes as code
    for (let i = 1; i < len && pc + i < table.length; i++) {
      if (table[pc + i].state !== 'data') {
        table[pc + i].state = 'code';
      }
    }

    // Extract target address and determine if it's a control flow instruction
    const isControlFlow = opcode.flow === 'jump' || opcode.flow === 'call' || opcode.flow === 'branch';
    let targetAddr: number | null = null;

    if (opcode.flow === 'branch' && pc + 1 < table.length) {
      targetAddr = relativeToAbsolute(table[pc + 1].byte, startAddr + pc + len);
    } else if (['abs', 'abx', 'aby'].includes(opcode.mode) && pc + 2 < table.length) {
      targetAddr = Hex.address(table[pc + 1].byte, table[pc + 2].byte);
    }

    // Mark targets and track XREFs
    if (targetAddr !== null && inRange(targetAddr, startAddr, endAddr)) {
      const ti = targetAddr - startAddr;
      table[ti].xrefs.push(startAddr + pc);

      table[ti].isTarget = true;

      if (isControlFlow) {
        // JMP, JSR, branches - target is code
        if (table[ti].state !== 'data') {
          table[ti].state = 'code';
          worklist.push(ti);
        }
      } else {
        // LDA, STA, CMP, etc. - target is likely data
        if (table[ti].state === 'unknown') {
          table[ti].state = 'data';
        }
      }
    }

    // Follow fall-through (unless jump/return)
    const next = pc + len;
    if (opcode.flow !== 'jump' && opcode.flow !== 'return' && next < table.length) {
      if (table[next].state !== 'data') {
        worklist.push(next);
      }
    }
  }

  return table;
}

/* ================== CONVERSION PASS ================== */

function getLabel(address: number, labelMap: Map<number, string>, prefix: string): string {
  return labelMap.get(address) ?? prefix + Hex.toWord(address);
}

function formatXrefs(xrefs: number[]): string | undefined {
  if (xrefs.length === 0) return undefined;
  return 'XREF: ' + [...xrefs].sort((a, b) => a - b).map(a => '$' + Hex.toWord(a)).join(', ');
}

function getAbsoluteAddress(table: DisassembledByte[], idx: number, opcode: OpcodeInfo): number | null {
  if (['abs', 'abx', 'aby'].includes(opcode.mode) && idx + 2 < table.length) {
    return Hex.address(table[idx + 1].byte, table[idx + 2].byte);
  }
  return null;
}

function buildCommentsMap(table: DisassembledByte[], customComments: CustomComment[]): Map<number, string> {
  const map = new Map<number, string>();

  // Auto-generate C64 comments for code with absolute addresses
  for (let i = 0; i < table.length; i++) {
    const b = table[i];
    if (b.state !== 'code') continue;

    const opcode = opcodes[Hex.toByte(b.byte)];
    if (!opcode) continue;

    const absAddr = getAbsoluteAddress(table, i, opcode);
    if (absAddr !== null) {
      const comment = c64Mapping.get(absAddr);
      if (comment) map.set(b.addr, comment);
    }
  }

  // Custom comments override auto-generated
  for (const cc of customComments) {
    map.set(cc.address, cc.comment);
  }

  return map;
}

function createDataLine(
  table: DisassembledByte[],
  startIdx: number,
  label: string | undefined,
  pseudo: string,
  comments: Map<number, string>
): { line: DisassembledLine; nextIndex: number } {
  const bytes: number[] = [];
  let i = startIdx;

  // Collect up to 8 bytes, stopping at targets or code
  while (i < table.length && bytes.length < 8) {
    const b = table[i];
    if (i !== startIdx && (b.isTarget || b.state === 'code')) break;
    bytes.push(b.byte);
    i++;
  }

  const first = table[startIdx];
  const hexBytes = bytes.map(b => '$' + Hex.toByte(b)).join(', ');

  return {
    line: {
      address: first.addr,
      label,
      instruction: `${pseudo}byte ${hexBytes}`,
      comment: comments.get(first.addr),
      xrefComment: label ? formatXrefs(first.xrefs) : undefined,
      bytes,
      isData: true
    },
    nextIndex: i
  };
}

export function convertToProgram(
  table: DisassembledByte[],
  startAddr: number,
  pseudoPrefix = '!',
  customLabels: CustomLabel[] = [],
  customComments: CustomComment[] = []
): DisassembledLine[] {
  const program: DisassembledLine[] = [];
  const labelPrefix = get(settings).labelPrefix;
  const endAddr = startAddr + table.length;

  const labelMap = new Map(customLabels.map(l => [l.address, l.name]));
  const comments = buildCommentsMap(table, customComments);

  let i = 0;
  while (i < table.length) {
    const b = table[i];
    const label = b.isTarget ? getLabel(b.addr, labelMap, labelPrefix) : undefined;
    const opcodeHex = Hex.toByte(b.byte);
    const opcode = opcodes[opcodeHex];

    // Treat as data if: not code, no valid opcode, or illegal opcode (unless user marked)
    const isData = b.state !== 'code' || !opcode || (opcode.ill && !b.userMarked);

    if (isData) {
      const { line, nextIndex } = createDataLine(table, i, label, pseudoPrefix, comments);
      program.push(line);
      i = nextIndex;
      continue;
    }

    // Format instruction
    let instr = opcode.ins;
    const bytes = [b.byte];

    switch (opcode.mode) {
      case 'imm':
      case 'zp':
      case 'zpx':
      case 'zpy':
      case 'izx':
      case 'izy':
        if (i + 1 < table.length) {
          const operand = table[++i].byte;
          bytes.push(operand);

          if (opcode.flow === 'branch') {
            const target = relativeToAbsolute(operand, startAddr + i + 1);
            instr = instr.replace('$hh', getLabel(target, labelMap, labelPrefix));
          } else {
            instr = instr.replace('hh', Hex.toByte(operand));
          }
        }
        break;

      case 'abs':
      case 'abx':
      case 'aby':
      case 'ind':
        if (i + 2 < table.length) {
          const lo = table[++i].byte;
          const hi = table[++i].byte;
          bytes.push(lo, hi);
          const addr = Hex.address(lo, hi);

          if (inRange(addr, startAddr, endAddr)) {
            instr = instr.replace('$hhll', getLabel(addr, labelMap, labelPrefix));
          } else {
            instr = instr.replace('hh', Hex.toByte(hi)).replace('ll', Hex.toByte(lo));
          }
        }
        break;
    }

    program.push({
      address: b.addr,
      label,
      instruction: instr,
      comment: comments.get(b.addr),
      xrefComment: label ? formatXrefs(b.xrefs) : undefined,
      bytes
    });

    i++;
  }

  return program;
}

/* ================== MAIN ENTRY POINT ================== */

export async function disassembleWithEntrypoints(
  bytes: Uint8Array,
  startAddress: number,
  entrypoints: Entrypoint[],
  customLabels: CustomLabel[] = [],
  customComments: CustomComment[] = [],
  usePatternMatching: boolean = true
): Promise<DisassembledLine[]> {
  await Promise.all([loadOpcodes(), loadC64Mapping(), loadSyntax(), loadPatterns()]);

  const syntax = getSyntax();
  const analyzed = analyze(startAddress, bytes, entrypoints, usePatternMatching);
  return convertToProgram(analyzed, startAddress, syntax.pseudoOpcodePrefix, customLabels, customComments);
}
