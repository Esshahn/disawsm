/**
 * Assembly Exporter
 * Converts DisassembledLine[] to formatted .asm text file
 */

import type { DisassembledLine } from '$lib/services/enhancedDisassembler';
import { toHex } from '$lib/utils/format';
import { loadSyntax, getSyntax } from '$lib/services/syntaxService';

/**
 * Format a disassembled program as assembly text
 */
export async function formatAsAssembly(
  lines: DisassembledLine[],
  startAddress: number,
  showComments: boolean = true,
  filename?: string
): Promise<string> {
  // Load syntax definitions
  await loadSyntax();
  const syntax = getSyntax();

  const output: string[] = [];

  // Add comment header with filename and date
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  const displayName = filename || 'unknown';

  const c = syntax.commentPrefix;
  output.push(`${c}==========================================================`);
  output.push(`${c} ${displayName}`);
  output.push(`${c} disassembled with disawsm on ${dateStr}`);
  output.push(`${c}==========================================================`);
  output.push('');

  // Add program start address directive
  output.push(`* = $${toHex(startAddress, 4)}`);
  output.push('');

  for (const line of lines) {
    // Add empty line before labels
    if (line.label) {
      output.push('');
      output.push(line.label + syntax.labelSuffix);
    }

    // Add instruction with proper indentation (12 spaces)
    const indentation = ' '.repeat(12);
    const instruction = indentation + line.instruction;

    // Add comment if present and enabled
    if (showComments && line.comment) {
      // Pad instruction to align comments at column 40
      const paddedInstruction = instruction.padEnd(40, ' ');
      output.push(paddedInstruction + syntax.commentPrefix + ' ' + line.comment);
    } else {
      output.push(instruction);
    }
  }

  return output.join('\n');
}

/**
 * Download assembly text as .asm file
 */
export function downloadAssembly(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
