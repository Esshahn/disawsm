<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { config, loadedFile } from '$lib/stores/app';
  import { customLabels } from '$lib/stores/labels';
  import { customComments } from '$lib/stores/comments';
  import { entrypoints } from '$lib/stores/entrypoints';
  import { settings } from '$lib/stores/settings';
  import { disassembleWithEntrypoints } from '$lib/services/enhancedDisassembler';

  let labelsConfig = $derived($config?.window_labels);
  let allLabels = $state<Array<{ address: number; name: string; isCustom: boolean }>>([]);

  function handleNameChange(address: number, oldName: string, value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === oldName) return;

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      alert('Invalid label name. Must start with a letter or underscore and contain only alphanumeric characters and underscores.');
      return;
    }

    customLabels.setLabel(address, trimmed);
  }

  // Update all labels when disassembly changes
  $effect(() => {
    const file = $loadedFile;
    if (!file) {
      allLabels = [];
      return;
    }

    (async () => {
      try {
        const lines = await disassembleWithEntrypoints(
          file.bytes,
          file.startAddress,
          $entrypoints,
          $customLabels,
          $customComments
        );

        const labelMap = new Map<number, string>();
        for (const line of lines) {
          if (line.label) labelMap.set(line.address, line.label);
        }

        allLabels = Array.from(labelMap.entries())
          .map(([address, name]) => ({
            address,
            name,
            isCustom: $customLabels.some(l => l.address === address)
          }))
          .sort((a, b) => a.address - b.address);
      } catch (error) {
        console.error('Failed to update labels:', error);
        allLabels = [];
      }
    })();
  });
</script>

{#if labelsConfig}
<Window
  title="Labels"
  left={labelsConfig.left ?? 1000}
  top={labelsConfig.top ?? 500}
  width={`${labelsConfig.width ?? 500}px`}
  height={`${labelsConfig.height ?? 400}px`}
  closeable={labelsConfig.closeable ?? true}
  resizable={labelsConfig.resizable ?? true}
  windowKey="window_labels"
>
  <div class="content">
    {#if allLabels.length === 0}
      <div class="empty">No labels found. Load a file and add entrypoints to generate labels.</div>
    {:else}
      {#each allLabels as label (label.address)}
        <div class="row" class:custom={label.isCustom}>
          <span class="address">${label.address.toString(16).toUpperCase().padStart(4, '0')}</span>
          <input
            type="text"
            class="name"
            class:custom={label.isCustom}
            value={label.name}
            onblur={(e) => handleNameChange(label.address, label.name, e.currentTarget.value)}
            placeholder="Enter custom name"
          />
          {#if label.isCustom}
            <button class="reset" onclick={() => customLabels.removeByAddress(label.address)} title="Reset to auto-generated">↺</button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</Window>
{/if}

<style>
  .content {
    height: 100%;
    overflow-y: auto;
    color: #fff;
    font-family: 'Quicksand', sans-serif;
  }

  .row {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #2a2a2a;
    align-items: center;
  }

  .row:hover {
    background: rgba(0, 198, 152, 0.05);
  }

  .row.custom {
    background: rgba(255, 170, 0, 0.05);
  }

  .row.custom:hover {
    background: rgba(255, 170, 0, 0.1);
  }

  .address {
    width: 80px;
    color: #00c698;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    flex-shrink: 0;
  }

  .name {
    flex: 1;
    background: #1a1a1a;
    border: 1px solid #3a3a3a;
    color: #aaa;
    padding: 6px 10px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    outline: none;
  }

  .name.custom {
    color: #ffaa00;
    font-weight: bold;
    border-color: rgba(255, 170, 0, 0.3);
  }

  .name:focus {
    border-color: #ffaa00;
  }

  .name::placeholder {
    color: #555;
    font-weight: normal;
  }

  .reset {
    width: 32px;
    padding: 6px;
    background: rgba(0, 198, 152, 0.1);
    border: 1px solid rgba(0, 198, 152, 0.5);
    border-radius: 4px;
    color: #00c698;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.2s;
  }

  .reset:hover {
    background: rgba(0, 198, 152, 0.2);
  }

  .empty {
    padding: 20px;
    text-align: center;
    color: #666;
    font-size: 13px;
    line-height: 1.6;
  }
</style>
