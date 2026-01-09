// Load opcodes dynamically to avoid Vite build issues
let opcodes: Record<string, { ins: string; ill?: number; rel?: number }> = {};
let opcodesLoaded = false;

async function loadOpcodes() {
  if (opcodesLoaded) return;

  const response = await fetch('/json/opcodes.json');
  opcodes = await response.json();
  opcodesLoaded = true;
}

export interface DisassembledLine {
  address: number;
  bytes: number[];
  instruction: string;
  opcode: string;
}

/**
 * Converts a number to hex string (2 digits)
 */
function numberToHexByte(num: number): string {
  return num.toString(16).padStart(2, '0');
}

/**
 * Gets instruction length based on Python implementation
 * Counts "hh" and "ll" in the opcode template
 */
function getInstructionLength(ins: string): number {
  let length = 0;
  if (ins.includes('hh')) length += 1;
  if (ins.includes('ll')) length += 1;
  return length;
}

/**
 * Disassembles the entire data buffer into 6502 assembly instructions
 * Based on the Python disass.py implementation
 */
export async function disassemble(data: Uint8Array, startAddress: number): Promise<DisassembledLine[]> {
  // Ensure opcodes are loaded
  await loadOpcodes();

  // Pre-allocate with estimated size (assume ~2 bytes per instruction on average)
  const estimatedSize = Math.ceil(data.length / 2);
  const lines: DisassembledLine[] = new Array(estimatedSize);
  let lineIndex = 0;
  let i = 0;
  const end = data.length;

  while (i < end) {
    const byte = data[i];
    const byteHex = numberToHexByte(byte);
    const opcode = opcodes[byteHex];

    if (!opcode) {
      // Unknown opcode - treat as single byte
      lines[lineIndex++] = {
        address: startAddress + i,
        bytes: [byte],
        instruction: '???',
        opcode: byteHex.toUpperCase()
      };
      i++;
      continue;
    }

    let ins = opcode.ins;
    const instrLength = getInstructionLength(ins);
    const instrBytes: number[] = [byte];
    const currentAddress = startAddress + i;

    // TWO BYTE INSTRUCTION (opcode + 1 operand byte)
    if (instrLength === 1) {
      if (i + 1 < end) {
        i++;
        const highByte = data[i];
        instrBytes.push(highByte);
        const highByteHex = numberToHexByte(highByte);

        // Replace $hh with actual hex value
        ins = ins.replace('$hh', '$' + highByteHex);
        ins = ins.replace('hh', highByteHex);
      }
    }
    // THREE BYTE INSTRUCTION (opcode + 2 operand bytes)
    else if (instrLength === 2) {
      if (i + 2 < end) {
        i++;
        const lowByte = data[i];
        instrBytes.push(lowByte);
        i++;
        const highByte = data[i];
        instrBytes.push(highByte);

        const lowByteHex = numberToHexByte(lowByte);
        const highByteHex = numberToHexByte(highByte);

        // Replace ll and hh with actual hex values
        ins = ins.replace('hh', highByteHex);
        ins = ins.replace('ll', lowByteHex);
      }
    }

    lines[lineIndex++] = {
      address: currentAddress,
      bytes: instrBytes,
      instruction: ins,
      opcode: byteHex.toUpperCase()
    };

    i++;
  }

  // Trim array to actual size
  lines.length = lineIndex;
  return lines;
}
