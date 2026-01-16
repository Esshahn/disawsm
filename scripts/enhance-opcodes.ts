/**
 * Script to enhance opcodes.json with metadata (len, mode, flow)
 * Run with: npx tsx scripts/enhance-opcodes.ts
 */

import fs from 'fs';
import path from 'path';

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

interface OldOpcode {
  ins: string;
  ill?: number;
  rel?: number;
}

interface NewOpcode {
  ins: string;
  len: number;
  mode: AddressingMode;
  flow?: FlowType;
  ill?: number;
  cycles?: number;
}

function inferAddressingMode(ins: string): AddressingMode {
  // Order matters - check more specific patterns first
  if (ins.includes('#$hh')) return 'imm';
  if (ins.includes('($hhll)')) return 'ind';
  if (ins.includes('($hh,x)')) return 'izx';
  if (ins.includes('($hh),y')) return 'izy';
  if (ins.includes('$hhll,x')) return 'abx';
  if (ins.includes('$hhll,y')) return 'aby';
  if (ins.includes('$hhll')) return 'abs';
  if (ins.includes('$hh,x')) return 'zpx';
  if (ins.includes('$hh,y')) return 'zpy';
  if (ins.includes('$hh')) return 'zp';

  // Check for accumulator mode (shift/rotate instructions without operand)
  const mnemonic = ins.split(' ')[0];
  if (['asl', 'lsr', 'rol', 'ror'].includes(mnemonic) && !ins.includes('$')) {
    return 'acc';
  }

  return 'imp';
}

function inferLength(ins: string): number {
  const hasHH = ins.includes('hh');
  const hasLL = ins.includes('ll');
  return 1 + (hasHH ? 1 : 0) + (hasLL ? 1 : 0);
}

function inferFlowType(opcode: string, ins: string, mode: AddressingMode): FlowType | undefined {
  const mnemonic = ins.split(' ')[0];

  // JSR - subroutine call
  if (opcode === '20') return 'call';

  // JMP - unconditional jump
  if (opcode === '4c' || opcode === '6c') return 'jump';

  // RTS, RTI - return from subroutine/interrupt
  if (opcode === '60' || opcode === '40') return 'return';

  // Relative addressing = branch instruction
  if (mode === 'zp' && ['bpl', 'bmi', 'bvc', 'bvs', 'bcc', 'bcs', 'bne', 'beq'].includes(mnemonic)) {
    // These are actually relative, not zero page
    return 'branch';
  }

  return undefined;
}

/**
 * Get cycle count for an opcode
 * Based on: http://www.6502.org/tutorials/6502opcodes.html
 * Note: Some instructions have variable cycles (+1 if page boundary crossed, +1 if branch taken)
 * We return the base cycle count here
 */
function getCycles(opcode: string, mode: AddressingMode, mnemonic: string): number {
  // Hardcoded cycle table for accuracy
  const cyclemap: Record<string, number> = {
    // Implied/Accumulator (2 cycles)
    '0a': 2, '2a': 2, '4a': 2, '6a': 2, // ASL, ROL, LSR, ROR A
    '18': 2, '38': 2, '58': 2, '78': 2, // CLC, SEC, CLI, SEI
    'd8': 2, 'f8': 2, // CLD, SED
    'b8': 2, // CLV
    'ca': 2, '88': 2, // DEX, DEY
    'e8': 2, 'c8': 2, // INX, INY
    '8a': 2, '98': 2, 'a8': 2, 'aa': 2, 'ba': 2, '9a': 2, // Transfers
    'ea': 2, // NOP

    // Stack (3-4 cycles)
    '48': 3, '08': 3, // PHA, PHP
    '68': 4, '28': 4, // PLA, PLP

    // Returns (6 cycles)
    '60': 6, '40': 6, // RTS, RTI

    // Breaks and jumps
    '00': 7, // BRK
    '4c': 3, '6c': 5, // JMP abs, JMP ind
    '20': 6, // JSR
  };

  // Check hardcoded first
  if (cyclemap[opcode]) {
    return cyclemap[opcode];
  }

  // Branch instructions (base 2 cycles, +1 if taken, +1 if page cross)
  const branches = ['bpl', 'bmi', 'bvc', 'bvs', 'bcc', 'bcs', 'bne', 'beq'];
  if (branches.includes(mnemonic)) {
    return 2; // Base cycles (can be 3-4 depending on branch taken/page cross)
  }

  // Read-Modify-Write instructions (RMW) have different cycles
  const rmw = ['asl', 'lsr', 'rol', 'ror', 'inc', 'dec'];
  if (rmw.includes(mnemonic)) {
    switch (mode) {
      case 'zp': return 5;
      case 'zpx': return 6;
      case 'abs': return 6;
      case 'abx': return 7;
      default: return 2; // Accumulator mode
    }
  }

  // Infer from addressing mode and mnemonic
  switch (mode) {
    case 'imm': return 2;
    case 'zp': return mnemonic.startsWith('st') ? 3 : 3;
    case 'zpx':
    case 'zpy': return mnemonic.startsWith('st') ? 4 : 4;
    case 'abs': return mnemonic.startsWith('st') ? 4 : 4;
    case 'abx':
    case 'aby': return mnemonic.startsWith('st') ? 5 : 4; // +1 for stores
    case 'ind': return 5; // JMP (indirect)
    case 'izx': return mnemonic.startsWith('st') ? 6 : 6;
    case 'izy': return mnemonic.startsWith('st') ? 6 : 5; // +1 for stores
    case 'acc': return 2;
    case 'imp': return 2;
  }

  return 2; // Default
}

function enhanceOpcodes(inputPath: string, outputPath: string) {
  console.log(`Reading opcodes from: ${inputPath}`);
  const data = fs.readFileSync(inputPath, 'utf-8');
  const oldOpcodes: Record<string, OldOpcode> = JSON.parse(data);

  const newOpcodes: Record<string, NewOpcode> = {};

  for (const [opcode, old] of Object.entries(oldOpcodes)) {
    const mode = inferAddressingMode(old.ins);
    const len = inferLength(old.ins);

    // Special handling for relative branches
    // They appear as zero page in the template but are actually relative
    let actualMode = mode;
    if (old.rel === 1 || mode === 'zp') {
      const mnemonic = old.ins.split(' ')[0];
      if (['bpl', 'bmi', 'bvc', 'bvs', 'bcc', 'bcs', 'bne', 'beq'].includes(mnemonic)) {
        actualMode = 'zp'; // Keep as zp since template uses $hh not a label yet
      }
    }

    const flow = inferFlowType(opcode, old.ins, actualMode);
    const mnemonic = old.ins.split(' ')[0];
    const cycles = getCycles(opcode, actualMode, mnemonic);

    const enhanced: NewOpcode = {
      ins: old.ins,
      len,
      mode: actualMode,
      cycles,
    };

    if (flow) enhanced.flow = flow;
    if (old.ill) enhanced.ill = old.ill;

    newOpcodes[opcode] = enhanced;
  }

  console.log(`Writing enhanced opcodes to: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(newOpcodes, null, 2), 'utf-8');

  // Print statistics
  const total = Object.keys(newOpcodes).length;
  const illegal = Object.values(newOpcodes).filter((op) => op.ill).length;
  const withFlow = Object.values(newOpcodes).filter((op) => op.flow).length;

  console.log(`\n✓ Enhanced ${total} opcodes`);
  console.log(`  - ${illegal} illegal opcodes`);
  console.log(`  - ${withFlow} with flow control`);

  // Show mode distribution
  const modeCount: Record<string, number> = {};
  for (const op of Object.values(newOpcodes)) {
    modeCount[op.mode] = (modeCount[op.mode] || 0) + 1;
  }

  console.log('\nAddressing mode distribution:');
  for (const [mode, count] of Object.entries(modeCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${mode.padEnd(4)} : ${count}`);
  }

  // Show flow type distribution
  const flowCount: Record<string, number> = {};
  for (const op of Object.values(newOpcodes)) {
    if (op.flow) {
      flowCount[op.flow] = (flowCount[op.flow] || 0) + 1;
    }
  }

  console.log('\nFlow type distribution:');
  for (const [flow, count] of Object.entries(flowCount)) {
    console.log(`  ${flow.padEnd(8)} : ${count}`);
  }
}

// Main execution
const inputPath = path.join(process.cwd(), 'public/json/opcodes.json');
const outputPath = path.join(process.cwd(), 'public/json/opcodes-enhanced.json');

enhanceOpcodes(inputPath, outputPath);

console.log('\n✓ Done! Review the output and replace opcodes.json when ready.');
