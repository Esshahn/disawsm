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

let opcodes: Record<string, { ins: string; ill?: number; rel?: number }> = {};
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

function getInstructionLength(ins: string): number {
  let len = 0;
  if (ins.includes('hh')) len++;
  if (ins.includes('ll')) len++;
  return len;
}

const FLOW_TERMINATORS = new Set(['4c', '60', '40']); // JMP, RTS, RTI

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
 * ANALYSIS (FIXED)
 * - Full reset on every run
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

  // 🔴 HARD RESET (critical fix)
  for (const b of table) {
    b.code = false;
    b.data = false;
    b.dest = false;
  }

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

    const len = getInstructionLength(opcode.ins);

    // Mark operand bytes as code unless already data
    for (let i = 1; i <= len; i++) {
      if (pc + i < table.length && !table[pc + i].data) {
        table[pc + i].code = true;
      }
    }

    let targetAddr: number | null = null;

    if ('rel' in opcode && pc + 1 < table.length) {
      targetAddr = getAbsFromRelative(
        table[pc + 1].byte,
        startAddr + pc + 2
      );
    } else if (len === 2 && pc + 2 < table.length) {
      targetAddr = Hex.bytesToAddress(
        table[pc + 2].byte,
        table[pc + 1].byte
      );
    }

    // Branch / jump target
    if (targetAddr !== null && addrInProgram(targetAddr, startAddr, endAddr)) {
      const ti = targetAddr - startAddr;
      if (!table[ti].data) {
        table[ti].dest = true;
        table[ti].code = true;
        worklist.push(ti);
      }
    }

    const next = pc + len + 1;

    // JSR: follow fall-through
    if (byte.byte === '20') {
      if (next < table.length && !table[next].data) {
        worklist.push(next);
      }
      continue;
    }

    // Normal fall-through
    if (!FLOW_TERMINATORS.has(byte.byte)) {
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

function extractAbsoluteAddress(instr: string): number | null {
  const m = instr.match(/\$([0-9a-f]{4})/i);
  return m ? parseInt(m[1], 16) : null;
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
 * Build a unified comments map from auto-generated C64 comments and custom comments
 * Custom comments override auto-generated ones at the same address
 */
function buildCommentsMap(
  byteArray: DisassembledByte[],
  startAddr: number,
  customComments: CustomComment[]
): Map<number, string> {
  const commentsMap = new Map<number, string>();

  // First pass: Add all auto-generated C64 comments
  for (const b of byteArray) {
    if (!b.code || b.data) continue;

    const opcode = opcodes[b.byte];
    if (!opcode) continue;

    // Find the index of this byte
    const i = b.addr - startAddr;
    const len = getInstructionLength(opcode.ins);

    // Build instruction to extract absolute address
    let instr = opcode.ins;
    if (len === 1 && i + 1 < byteArray.length) {
      const op = byteArray[i + 1].byte;
      instr = instr.replace('hh', op);
    }
    if (len === 2 && i + 2 < byteArray.length) {
      const ll = byteArray[i + 1].byte;
      const hh = byteArray[i + 2].byte;
      instr = instr.replace('hh', hh).replace('ll', ll);
    }

    const abs = extractAbsoluteAddress(instr);
    if (abs !== null) {
      const autoComment = getC64Comment(abs);
      if (autoComment) {
        commentsMap.set(b.addr, autoComment);
      }
    }
  }

  // Second pass: Override with custom comments
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
    const len = getInstructionLength(instr);
    const bytes = [Hex.toNumber(b.byte)];

    if (len === 1 && i + 1 < byteArray.length) {
      const op = byteArray[++i].byte;
      bytes.push(Hex.toNumber(op));
      if ('rel' in opcode) {
        const targetAddr = getAbsFromRelative(op, startAddr + i + 1);
        const labelName = getLabel(targetAddr, customLabels, labelPrefix);
        instr = instr.replace('$hh', labelName);
      } else {
        instr = instr.replace('hh', op);
      }
    }

    if (len === 2 && i + 2 < byteArray.length) {
      const ll = byteArray[++i].byte;
      const hh = byteArray[++i].byte;
      bytes.push(Hex.toNumber(ll), Hex.toNumber(hh));
      const addr = Hex.bytesToAddress(hh, ll);
      instr = instr.replace('hh', hh).replace('ll', ll);
      if (addrInProgram(addr, startAddr, endAddr)) {
        const labelName = getLabel(addr, customLabels, labelPrefix);
        instr = instr.replace('$', labelName);
      }
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
