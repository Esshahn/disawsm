/**
 * Syntax Service
 * Centralized loading and retrieval of assembler syntax definitions
 */

import type { AssemblerSyntax } from '$lib/types';
import { get } from 'svelte/store';
import { settings } from '$lib/stores/settings';

// Cached syntax definitions
let syntaxDefinitions: Record<string, AssemblerSyntax> = {};
let syntaxLoaded = false;

// Default fallback syntax
const DEFAULT_SYNTAX: AssemblerSyntax = {
  name: 'ACME',
  commentPrefix: ';',
  labelSuffix: '',
  pseudoOpcodePrefix: '!'
};

/**
 * Load syntax definitions from JSON file
 * Results are cached after first load
 */
export async function loadSyntax(): Promise<void> {
  if (syntaxLoaded) return;

  const response = await fetch('/json/syntax.json');
  const data = await response.json();
  syntaxDefinitions = data.syntaxes;
  syntaxLoaded = true;
}

/**
 * Get the current syntax based on user settings
 * Handles both predefined syntaxes and custom syntax
 */
export function getSyntax(): AssemblerSyntax {
  const currentSettings = get(settings);
  const syntaxKey = currentSettings.assemblerSyntax;

  // Handle custom syntax
  if (syntaxKey === 'custom') {
    const custom = currentSettings.customSyntax;
    return {
      name: 'Custom',
      // Use custom values with fallbacks for safety
      commentPrefix: custom?.commentPrefix || DEFAULT_SYNTAX.commentPrefix,
      labelSuffix: custom?.labelSuffix ?? DEFAULT_SYNTAX.labelSuffix,
      pseudoOpcodePrefix: custom?.pseudoOpcodePrefix || DEFAULT_SYNTAX.pseudoOpcodePrefix
    };
  }

  // For predefined syntaxes, fall back gracefully
  return syntaxDefinitions[syntaxKey] || syntaxDefinitions['acme'] || DEFAULT_SYNTAX;
}

/**
 * Get all loaded syntax definitions
 * Useful for settings UI to show available options
 */
export function getSyntaxDefinitions(): Record<string, AssemblerSyntax> {
  return syntaxDefinitions;
}
