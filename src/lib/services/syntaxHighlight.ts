/**
 * Syntax Highlighting Service
 * Provides color highlighting for 6502 assembly code
 */

export interface SyntaxColors {
  opcode: string;
  label: string;
  immediate: string;
  address: string;
  register: string;
  comment: string;
}

export interface HighlightedToken {
  text: string;
  color: string;
}

let colors: SyntaxColors | null = null;

export async function loadSyntaxColors(): Promise<SyntaxColors> {
  if (colors) return colors;

  const response = await fetch('/json/syntax-highlight.json');
  const data = await response.json();
  colors = data.colors;
  return colors;
}

/**
 * Parse an instruction string and return highlighted tokens
 * Examples:
 *   "lda #$20"       -> [opcode, immediate]
 *   "jsr _0824"      -> [opcode, label]
 *   "sta $d020"      -> [opcode, address]
 *   "lda $0824,x"    -> [opcode, address, register]
 */
export function highlightInstruction(instruction: string, colors: SyntaxColors): HighlightedToken[] {
  const tokens: HighlightedToken[] = [];

  // Pattern: opcode followed by optional operand
  const match = instruction.match(/^([a-z]{3})(?:\s+(.+))?$/i);

  if (!match) {
    // No match, return as plain text
    return [{ text: instruction, color: colors.opcode }];
  }

  const [, opcode, operand] = match;

  // Add opcode
  tokens.push({ text: opcode, color: colors.opcode });

  if (!operand) {
    // No operand (e.g., "rts", "nop")
    return tokens;
  }

  tokens.push({ text: ' ', color: colors.opcode });

  // Parse operand
  const operandTokens = parseOperand(operand, colors);
  tokens.push(...operandTokens);

  return tokens;
}

function parseOperand(operand: string, colors: SyntaxColors): HighlightedToken[] {
  const tokens: HighlightedToken[] = [];

  // Immediate value: #$xx
  if (operand.startsWith('#$')) {
    const match = operand.match(/^(#\$[0-9a-f]+)(.*)/i);
    if (match) {
      tokens.push({ text: match[1], color: colors.immediate });
      if (match[2]) {
        tokens.push(...parseRemainder(match[2], colors));
      }
      return tokens;
    }
  }

  // Label (starts with letter or underscore)
  if (/^[a-z_]/i.test(operand)) {
    const match = operand.match(/^([a-z_][a-z0-9_]*)(.*)/i);
    if (match) {
      tokens.push({ text: match[1], color: colors.label });
      if (match[2]) {
        tokens.push(...parseRemainder(match[2], colors));
      }
      return tokens;
    }
  }

  // Address: $xxxx or $xx
  if (operand.startsWith('$')) {
    const match = operand.match(/^(\$[0-9a-f]+)(.*)/i);
    if (match) {
      tokens.push({ text: match[1], color: colors.address });
      if (match[2]) {
        tokens.push(...parseRemainder(match[2], colors));
      }
      return tokens;
    }
  }

  // Indirect addressing: ($xx) or ($xxxx)
  if (operand.startsWith('(')) {
    tokens.push({ text: '(', color: colors.register });

    const innerMatch = operand.match(/^\(([^)]+)\)(.*)/);
    if (innerMatch) {
      const inner = innerMatch[1];
      const remainder = innerMatch[2];

      // Parse the inner part
      if (inner.startsWith('$')) {
        tokens.push({ text: inner, color: colors.address });
      } else {
        tokens.push({ text: inner, color: colors.label });
      }

      tokens.push({ text: ')', color: colors.register });

      if (remainder) {
        tokens.push(...parseRemainder(remainder, colors));
      }

      return tokens;
    }
  }

  // Default: parse as remainder
  return parseRemainder(operand, colors);
}

function parseRemainder(remainder: string, colors: SyntaxColors): HighlightedToken[] {
  const tokens: HighlightedToken[] = [];

  // Parse indexed addressing: ,x or ,y
  const match = remainder.match(/^(,)([xy])/i);
  if (match) {
    tokens.push({ text: match[1], color: colors.register });
    tokens.push({ text: match[2], color: colors.register });
    return tokens;
  }

  // Default: return as register color (punctuation)
  return [{ text: remainder, color: colors.register }];
}

/**
 * Parse a data line (e.g., "!byte $20, $30, $40")
 */
export function highlightDataLine(instruction: string, colors: SyntaxColors): HighlightedToken[] {
  const tokens: HighlightedToken[] = [];

  // Pattern: pseudo-opcode followed by bytes
  const match = instruction.match(/^([!.][a-z]+)\s+(.+)$/i);

  if (!match) {
    return [{ text: instruction, color: colors.opcode }];
  }

  const [, pseudoOp, bytesStr] = match;

  // Pseudo-opcode
  tokens.push({ text: pseudoOp, color: colors.opcode });
  tokens.push({ text: ' ', color: colors.opcode });

  // Parse bytes (e.g., "$20, $30, $40")
  const bytes = bytesStr.split(',');
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i].trim();
    if (byte.startsWith('$')) {
      tokens.push({ text: byte, color: colors.address });
    } else {
      tokens.push({ text: byte, color: colors.opcode });
    }

    if (i < bytes.length - 1) {
      tokens.push({ text: ', ', color: colors.register });
    }
  }

  return tokens;
}
