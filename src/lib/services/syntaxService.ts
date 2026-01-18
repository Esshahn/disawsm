/**
 * Syntax Service
 * Centralized loading and retrieval of assembler syntax definitions
 * JSON file is the single source of truth for syntax definitions
 */

import type { AssemblerSyntax } from '$lib/types';
import { get } from 'svelte/store';
import { settings } from '$lib/stores/settings';

// Fallback used only if getSyntax() called before loadSyntax()
const FALLBACK: AssemblerSyntax = {
  id: 'acme',
  name: 'ACME Assembler',
  commentPrefix: ';',
  labelSuffix: '',
  pseudoOpcodePrefix: '!'
};

let syntaxList: AssemblerSyntax[] = [];
let syntaxLoaded = false;

export async function loadSyntax(): Promise<void> {
  if (syntaxLoaded) return;

  const response = await fetch('/json/syntax.json');
  const data = await response.json();
  syntaxList = data.syntaxes;
  syntaxLoaded = true;
}

export function getSyntax(): AssemblerSyntax {
  const { assemblerSyntax, customSyntax } = get(settings);
  const base = syntaxList[0] || FALLBACK;

  if (assemblerSyntax === 'custom') {
    return {
      id: 'custom',
      name: 'Custom',
      commentPrefix: customSyntax?.commentPrefix || base.commentPrefix,
      labelSuffix: customSyntax?.labelSuffix ?? base.labelSuffix,
      pseudoOpcodePrefix: customSyntax?.pseudoOpcodePrefix || base.pseudoOpcodePrefix
    };
  }

  return syntaxList.find(s => s.id === assemblerSyntax) || base;
}

export function getSyntaxList(): AssemblerSyntax[] {
  return syntaxList;
}
