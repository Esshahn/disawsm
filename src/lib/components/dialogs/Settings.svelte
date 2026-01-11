<script lang="ts">
  import { settings } from '$lib/stores/settings';

  let {
    onclose
  }: {
    onclose?: () => void;
  } = $props();

  // Local state for input fields
  let labelPrefixInput = $state($settings.labelPrefix);
  let assemblerSyntaxInput = $state($settings.assemblerSyntax);

  function handleClose() {
    onclose?.();
  }

  function handleSave() {
    // Update settings store (will auto-save to localStorage)
    settings.update(s => ({
      ...s,
      labelPrefix: labelPrefixInput,
      assemblerSyntax: assemblerSyntaxInput
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
      <div class="settings-section">
        <label for="labelPrefix">
          <strong>Label Prefix</strong>
          <p class="help-text">Prefix used when generating labels (e.g., "_" creates "_d020")</p>
        </label>
        <input
          id="labelPrefix"
          type="text"
          bind:value={labelPrefixInput}
          placeholder="_"
          maxlength="10"
        />
      </div>

      <div class="settings-section">
        <label for="assemblerSyntax">
          <strong>Assembler Syntax</strong>
          <p class="help-text">Choose the output format for comments and labels</p>
        </label>
        <select
          id="assemblerSyntax"
          bind:value={assemblerSyntaxInput}
        >
          <option value="acme">ACME</option>
          <option value="kickass">Kick Assembler</option>
        </select>
      </div>

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
    width: 480px;
    max-width: 90vw;
  }

  .settings-content {
    padding: 24px;
  }

  .settings-section {
    margin-bottom: 24px;
  }

  .settings-section label {
    display: block;
    margin-bottom: 8px;
  }

  .help-text {
    color: #aaaaaa;
    font-size: 13px;
    margin: 4px 0 8px 0;
    line-height: 140%;
  }

  input[type="text"] {
    width: 100%;
    padding: 8px 12px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    background-color: #1a1a1a;
    color: #ffffff;
    border: 1px solid #333;
    border-radius: 4px;
    box-sizing: border-box;
  }

  input[type="text"]:focus {
    outline: none;
    border-color: #00c698;
  }

  select {
    width: 100%;
    padding: 8px 12px;
    font-family: 'Quicksand', sans-serif;
    font-size: 14px;
    background-color: #1a1a1a;
    color: #ffffff;
    border: 1px solid #333;
    border-radius: 4px;
    box-sizing: border-box;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #00c698;
  }

  select option {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  .button-group {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 24px;
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
