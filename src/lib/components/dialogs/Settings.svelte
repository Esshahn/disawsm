<script lang="ts">
  import { settings } from '$lib/stores/settings';
  import type { AssemblerSyntax } from '$lib/types';
  import { loadSyntax, getSyntaxDefinitions } from '$lib/services/syntaxService';

  let {
    onclose
  }: {
    onclose?: () => void;
  } = $props();

  // Syntax definitions loaded from shared service
  let syntaxDefinitions = $state<Record<string, AssemblerSyntax>>({});

  // Load syntax definitions on mount
  $effect(() => {
    loadSyntax().then(() => {
      syntaxDefinitions = getSyntaxDefinitions();
    });
  });

  // Local state for input fields
  let labelPrefixInput = $state($settings.labelPrefix);
  let assemblerSyntaxInput = $state<'acme' | 'kickass' | 'krill' | 'custom'>($settings.assemblerSyntax);

  // Custom syntax fields (customSyntax is always defined in settings store)
  let customCommentPrefix = $state($settings.customSyntax!.commentPrefix);
  let customLabelSuffix = $state($settings.customSyntax!.labelSuffix);
  let customPseudoOpcodePrefix = $state($settings.customSyntax!.pseudoOpcodePrefix);

  // Whether custom fields are editable
  let isCustom = $derived(assemblerSyntaxInput === 'custom');

  // Update custom fields when syntax selection changes (for non-custom selections)
  $effect(() => {
    // Track both dependencies
    const selectedSyntax = assemblerSyntaxInput;
    const definitions = syntaxDefinitions;

    if (selectedSyntax !== 'custom' && definitions[selectedSyntax]) {
      const syntax = definitions[selectedSyntax];
      customCommentPrefix = syntax.commentPrefix;
      customLabelSuffix = syntax.labelSuffix;
      customPseudoOpcodePrefix = syntax.pseudoOpcodePrefix;
    }
  });

  function handleClose() {
    onclose?.();
  }

  function handleSave() {
    // Update settings store (will auto-save to localStorage)
    settings.update(s => ({
      ...s,
      labelPrefix: labelPrefixInput,
      assemblerSyntax: assemblerSyntaxInput,
      customSyntax: {
        commentPrefix: customCommentPrefix,
        labelSuffix: customLabelSuffix,
        pseudoOpcodePrefix: customPseudoOpcodePrefix
      }
    }));
    handleClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    } else if (event.key === 'Enter') {
      handleSave();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal overlay using unified styles -->
<div class="modal-overlay" onclick={handleClose}>
  <div class="dialog-wrapper settings-dialog" onclick={(e: MouseEvent) => e.stopPropagation()}>
    <div class="dialog-titlebar" style="cursor: default;">
      <span class="dialog-title">Settings</span>
      <button class="window-close-button" onclick={handleClose}>×</button>
    </div>

    <div class="dialog-content settings-content">
      <div class="settings-row">
        <div class="row-label">
          <label for="labelPrefix">Label Prefix</label>
          <p class="help-text">Prefix for generated labels</p>
        </div>
        <input
          id="labelPrefix"
          type="text"
          bind:value={labelPrefixInput}
          placeholder="_"
          maxlength="10"
        />
      </div>

      <fieldset class="syntax-fieldset">
        <legend>Assembler Syntax</legend>

        <div class="settings-row">
          <div class="row-label">
            <label for="assemblerSyntax">Preset</label>
            <p class="help-text">Output format for assembly</p>
          </div>
          <select
            id="assemblerSyntax"
            bind:value={assemblerSyntaxInput}
          >
            <option value="acme">ACME</option>
            <option value="kickass">Kick Assembler</option>
            <option value="krill">Krill</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div class="settings-row" class:disabled={!isCustom}>
          <div class="row-label">
            <label for="commentPrefix">Comment Prefix</label>
            <p class="help-text">Character(s) before comments</p>
          </div>
          <input
            id="commentPrefix"
            type="text"
            bind:value={customCommentPrefix}
            disabled={!isCustom}
            maxlength="4"
          />
        </div>

        <div class="settings-row" class:disabled={!isCustom}>
          <div class="row-label">
            <label for="labelSuffix">Label Suffix</label>
            <p class="help-text">Character(s) after labels</p>
          </div>
          <input
            id="labelSuffix"
            type="text"
            bind:value={customLabelSuffix}
            disabled={!isCustom}
            maxlength="4"
          />
        </div>

        <div class="settings-row" class:disabled={!isCustom}>
          <div class="row-label">
            <label for="pseudoOpcodePrefix">Pseudo-Opcode Prefix</label>
            <p class="help-text">Prefix for directives like .byte</p>
          </div>
          <input
            id="pseudoOpcodePrefix"
            type="text"
            bind:value={customPseudoOpcodePrefix}
            disabled={!isCustom}
            maxlength="4"
          />
        </div>
      </fieldset>

      <div class="button-group">
        <button class="secondary-button" onclick={handleClose}>Cancel</button>
        <button class="primary-button" onclick={handleSave}>Save</button>
      </div>
    </div>
  </div>
</div>

<style>
  /* Component-specific styles - base .modal-overlay, .dialog-wrapper,
     .dialog-titlebar, .dialog-title, and .window-close-button are in stylesheet.css */

  .settings-dialog {
    position: static;
    width: 420px;
    max-width: 90vw;
  }

  .settings-content {
    padding: 20px;
  }

  /* Row layout: label on left, input on right */
  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .row-label {
    flex: 1;
  }

  .row-label label {
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: #ffffff;
  }

  .help-text {
    color: #888;
    font-size: 11px;
    margin: 2px 0 0 0;
    line-height: 1.3;
  }

  .settings-row input[type="text"] {
    width: 80px;
    padding: 6px 10px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    background-color: #1a1a1a;
    color: #ffffff;
    border: 1px solid #333;
    border-radius: 4px;
    box-sizing: border-box;
    text-align: center;
  }

  .settings-row input[type="text"]:focus {
    outline: none;
    border-color: #00c698;
  }

  .settings-row input[type="text"]:disabled {
    background-color: #0d0d0d;
    color: #666;
    cursor: not-allowed;
  }

  .settings-row.disabled .row-label label {
    color: #666;
  }

  .settings-row.disabled .help-text {
    color: #555;
  }

  .settings-row select {
    width: 140px;
    padding: 6px 10px;
    font-family: 'Quicksand', sans-serif;
    font-size: 13px;
    background-color: #1a1a1a;
    color: #ffffff;
    border: 1px solid #333;
    border-radius: 4px;
    box-sizing: border-box;
    cursor: pointer;
  }

  .settings-row select:focus {
    outline: none;
    border-color: #00c698;
  }

  select option {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  /* Fieldset styling */
  .syntax-fieldset {
    border: 1px solid #333;
    border-radius: 6px;
    padding: 16px;
    margin: 20px 0;
  }

  .syntax-fieldset legend {
    color: #00c698;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0 8px;
  }

  .syntax-fieldset .settings-row:last-child {
    margin-bottom: 0;
  }

  .button-group {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 8px;
  }

  .primary-button,
  .secondary-button {
    font-family: 'Quicksand', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 4px;
  }

  .primary-button {
    border: 2px solid #00c698;
    background-color: #00c698;
    color: #ffffff;
  }

  .primary-button:hover {
    background-color: #03a27d;
    border-color: #03a27d;
  }

  .secondary-button {
    border: 2px solid #555;
    background-color: transparent;
    color: #ffffff;
  }

  .secondary-button:hover {
    background-color: #333;
    border-color: #666;
  }
</style>
