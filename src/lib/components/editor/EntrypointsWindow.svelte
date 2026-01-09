<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { config } from '$lib/stores/app';
  import { entrypoints, type EntrypointType } from '$lib/stores/entrypoints';

  let entrypointsConfig = $derived($config?.window_entrypoints);
  let left = $derived(entrypointsConfig?.left ?? 950);
  let top = $derived(entrypointsConfig?.top ?? 50);
  let width = $derived(`${entrypointsConfig?.width ?? 500}px`);
  let height = $derived(`${entrypointsConfig?.height ?? 400}px`);
  let closeable = $derived(entrypointsConfig?.closeable ?? false);
  let resizable = $derived(entrypointsConfig?.resizable ?? false);

  let newAddress = $state('');
  let newType = $state<EntrypointType>('code');

  function handleAddEntrypoint() {
    const trimmed = newAddress.trim();
    if (!trimmed) return;

    let address: number;
    if (trimmed.startsWith('$')) {
      address = parseInt(trimmed.slice(1), 16);
    } else if (trimmed.startsWith('0x')) {
      address = parseInt(trimmed.slice(2), 16);
    } else {
      address = parseInt(trimmed, 16);
    }

    if (isNaN(address) || address < 0 || address > 0xFFFF) {
      return;
    }

    entrypoints.add(address, newType);
    newAddress = '';
    newType = 'code';
  }

  function handleAddressChange(id: string, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    let address: number;
    if (trimmed.startsWith('$')) {
      address = parseInt(trimmed.slice(1), 16);
    } else if (trimmed.startsWith('0x')) {
      address = parseInt(trimmed.slice(2), 16);
    } else {
      address = parseInt(trimmed, 16);
    }

    if (isNaN(address) || address < 0 || address > 0xFFFF) {
      return;
    }

    entrypoints.updateAddress(id, address);
  }

  function handleTypeToggle(id: string, currentType: EntrypointType) {
    const newType = currentType === 'code' ? 'data' : 'code';
    entrypoints.updateType(id, newType);
  }

  function handleDelete(id: string) {
    entrypoints.remove(id);
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleAddEntrypoint();
    }
  }
</script>

{#if entrypointsConfig}
<Window
  title="Entrypoints"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_entrypoints"
>
  <div class="entrypoints-content">
    <div class="new-entrypoint-row">
      <input
        type="text"
        class="address-input"
        bind:value={newAddress}
        onkeypress={handleKeyPress}
        placeholder="Address"
      />
      <button
        class="type-toggle type-{newType}"
        onclick={() => newType = newType === 'code' ? 'data' : 'code'}
      >
        {newType}
      </button>
      <button
        class="add-button"
        onclick={handleAddEntrypoint}
        disabled={!newAddress.trim()}
      >
        +
      </button>
    </div>

    <div class="entrypoints-list">
      {#each $entrypoints as entrypoint (entrypoint.id)}
        <div class="entrypoint-row">
          <input
            type="text"
            class="address-input"
            value={'$' + entrypoint.address.toString(16).toUpperCase().padStart(4, '0')}
            onblur={(e) => handleAddressChange(entrypoint.id, e.currentTarget.value)}
          />
          <button
            class="type-toggle type-{entrypoint.type}"
            onclick={() => handleTypeToggle(entrypoint.id, entrypoint.type)}
          >
            {entrypoint.type}
          </button>
          <button
            class="delete-button"
            onclick={() => handleDelete(entrypoint.id)}
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  </div>
</Window>
{/if}

<style>
  .entrypoints-content {
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 12px;
  }

  .new-entrypoint-row {
    display: flex;
    gap: 8px;
    padding: 12px;
    background: rgba(0, 198, 152, 0.05);
    border: 1px solid rgba(0, 198, 152, 0.3);
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .entrypoint-row {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #2a2a2a;
  }

  .entrypoint-row:hover {
    background: rgba(0, 198, 152, 0.05);
  }

  .entrypoints-list {
    flex: 1;
    overflow-y: auto;
  }

  .address-input {
    flex: 1;
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    color: #00c698;
    padding: 6px 10px;
    border-radius: 4px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    outline: none;
  }

  .address-input:focus {
    border-color: #00c698;
  }

  .address-input::placeholder {
    color: #555555;
  }

  .type-toggle {
    width: 60px;
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid;
    font-family: 'Quicksand', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s ease;
  }

  .type-toggle.type-code {
    background: rgba(0, 198, 152, 0.1);
    border-color: #00c698;
    color: #00c698;
  }

  .type-toggle.type-code:hover {
    background: rgba(0, 198, 152, 0.2);
  }

  .type-toggle.type-data {
    background: rgba(255, 140, 0, 0.1);
    border-color: #ff8c00;
    color: #ff8c00;
  }

  .type-toggle.type-data:hover {
    background: rgba(255, 140, 0, 0.2);
  }

  .add-button {
    width: 32px;
    padding: 6px;
    background: #00c698;
    border: none;
    border-radius: 4px;
    color: #121212;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .add-button:hover:not(:disabled) {
    background: #00e6b0;
  }

  .add-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .delete-button {
    width: 32px;
    padding: 6px;
    background: rgba(255, 50, 50, 0.1);
    border: 1px solid rgba(255, 50, 50, 0.5);
    border-radius: 4px;
    color: #ff5050;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .delete-button:hover {
    background: rgba(255, 50, 50, 0.2);
    border-color: #ff5050;
  }
</style>
