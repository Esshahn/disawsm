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
  colors = data.colors as SyntaxColors;
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
    return [{ text: instruction, color: colors.opcode }];
  }

  const [, opcode, operand] = match;
  tokens.push({ text: opcode, color: colors.opcode });

  if (!operand) {
    return tokens;
  }

  tokens.push({ text: ' ', color: colors.opcode });
  tokens.push(...parseOperand(operand, colors));

  return tokens;
}

function parseOperand(operand: string, colors: SyntaxColors): HighlightedToken[] {
  const tokens: HighlightedToken[] = [];

  const addSuffix = (suffix: string) => {
    const match = suffix.match(/^(,)([xy])/i);
    if (match) {
      tokens.push({ text: match[1], color: colors.register });
      tokens.push({ text: match[2], color: colors.register });
    } else if (suffix) {
      tokens.push({ text: suffix, color: colors.register });
    }
  };

  // Immediate value: #$xx
  if (operand.startsWith('#$')) {
    const match = operand.match(/^(#\$[0-9a-f]+)(.*)/i);
    if (match) {
      tokens.push({ text: match[1], color: colors.immediate });
      addSuffix(match[2]);
      return tokens;
    }
  }

  // Indirect addressing: ($xx) or ($xxxx)
  if (operand.startsWith('(')) {
    const match = operand.match(/^\(([^)]+)\)(.*)/);
    if (match) {
      tokens.push({ text: '(', color: colors.register });
      const inner = match[1];
      tokens.push({
        text: inner,
        color: inner.startsWith('$') ? colors.address : colors.label
      });
      tokens.push({ text: ')', color: colors.register });
      addSuffix(match[2]);
      return tokens;
    }
  }

  // Address: $xxxx or $xx
  if (operand.startsWith('$')) {
    const match = operand.match(/^(\$[0-9a-f]+)(.*)/i);
    if (match) {
      tokens.push({ text: match[1], color: colors.address });
      addSuffix(match[2]);
      return tokens;
    }
  }

  // Everything else is a label
  const match = operand.match(/^(\S+)(.*)/);
  if (match) {
    tokens.push({ text: match[1], color: colors.label });
    addSuffix(match[2]);
    return tokens;
  }

  return [{ text: operand, color: colors.label }];
}

/**
 * Parse a data line (e.g., "!byte $20, $30, $40")
 */
export function highlightDataLine(instruction: string, colors: SyntaxColors): HighlightedToken[] {
  const match = instruction.match(/^([!.][a-z]+)\s+(.+)$/i);

  if (!match) {
    return [{ text: instruction, color: colors.opcode }];
  }

  const tokens: HighlightedToken[] = [
    { text: match[1], color: colors.opcode },
    { text: ' ', color: colors.opcode }
  ];

  // Split by comma and parse each byte
  const parts = match[2].split(/,\s*/);
  parts.forEach((part, i) => {
    tokens.push({
      text: part,
      color: part.startsWith('$') ? colors.address : colors.opcode
    });
    if (i < parts.length - 1) {
      tokens.push({ text: ', ', color: colors.register });
    }
  });

  return tokens;
}
