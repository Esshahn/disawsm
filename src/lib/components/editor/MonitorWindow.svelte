<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import DataView from './DataView.svelte';
  import CodeView from './CodeView.svelte';
  import JumpToAddress from '$lib/components/ui/JumpToAddress.svelte';
  import { loadedFile, config } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';

  // Tab state
  type ViewMode = 'data' | 'code';
  let activeView = $state<ViewMode>('data');
  let bytesPerLine = $state(16);
  let scrollToLineIndex = $state<number | undefined>(undefined);

  // Reactive declarations using $derived
  let monitorConfig = $derived($config?.window_monitor);
  let left = $derived(monitorConfig?.left ?? 210);
  let top = $derived(monitorConfig?.top ?? 50);
  let width = $derived(`${monitorConfig?.width ?? 800}px`);
  let height = $derived(`${monitorConfig?.height ?? 600}px`);
  let closeable = $derived(monitorConfig?.closeable ?? true);
  let resizable = $derived(monitorConfig?.resizable ?? true);

  function handleJump(targetAddress: number) {
    // Calculate line index based on active view
    if (!$loadedFile) return;

    if (activeView === 'data') {
      // For hex viewer, calculate which line contains the address
      const byteOffset = targetAddress - $loadedFile.startAddress;
      if (byteOffset >= 0 && byteOffset < $loadedFile.bytes.length) {
        scrollToLineIndex = Math.floor(byteOffset / bytesPerLine);
        // Reset after a brief moment to allow future jumps to same line
        setTimeout(() => {
          scrollToLineIndex = undefined;
        }, 100);
      }
    } else {
      // For code view, we'll need to find the instruction at this address
      // This will be handled by CodeView component
      scrollToLineIndex = targetAddress;
      setTimeout(() => {
        scrollToLineIndex = undefined;
      }, 100);
    }
  }
</script>

{#if monitorConfig}
<Window
  title="Monitor"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_monitor"
>
  {#if $loadedFile}
    <div class="monitor-content">
      <!-- Unified header with tabs and controls -->
      <div class="monitor-header">
        <div class="tabs">
          <button
            class="tab"
            class:active={activeView === 'data'}
            onclick={() => activeView = 'data'}
          >
            Data
          </button>
          <button
            class="tab"
            class:active={activeView === 'code'}
            onclick={() => activeView = 'code'}
          >
            Code
          </button>
        </div>

        <div class="controls">
          {#if activeView === 'data'}
            <span class="bytes-per-line-control">
              <label for="bytesPerLine">Bytes/Line:</label>
              <input
                id="bytesPerLine"
                type="number"
                bind:value={bytesPerLine}
                min="1"
                max="32"
                step="1"
              />
            </span>
          {/if}
          <JumpToAddress onjump={handleJump} />

          
        </div>
      </div>

      <!-- View container -->
      <div class="view-container">
        {#if activeView === 'data'}
          <DataView
            bytes={$loadedFile.bytes}
            startAddress={$loadedFile.startAddress}
            {bytesPerLine}
            {scrollToLineIndex}
          />
        {:else}
          <CodeView
            bytes={$loadedFile.bytes}
            startAddress={$loadedFile.startAddress}
            {scrollToLineIndex}
          />
        {/if}
      </div>
    </div>
  {:else}
    <div class="monitor-content" style="padding: 20px;">
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file.</p>
    </div>
  {/if}
</Window>
{/if}

<style>
  .monitor-content {
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .monitor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #2a2a2a;
    flex-shrink: 0;
    gap: 12px;
  }

  .tabs {
    display: flex;
    gap: 4px;
  }

  .tab {
    padding: 6px 16px;
    background: transparent;
    border: 1px solid #2a2a2a;
    border-radius: 4px;
    color: #aaaaaa;
    font-family: 'Quicksand', sans-serif;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab:hover {
    background: rgba(0, 198, 152, 0.1);
    border-color: rgba(0, 198, 152, 0.3);
    color: #ffffff;
  }

  .tab.active {
    background: rgba(0, 198, 152, 0.2);
    border-color: #00c698;
    color: #00c698;
    font-weight: bold;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .bytes-per-line-control {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bytes-per-line-control label {
    color: #aaaaaa;
    font-family: 'Quicksand', sans-serif;
    font-size: 12px;
  }

  .bytes-per-line-control input {
    width: 50px;
    padding: 2px 6px;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 3px;
    color: #00c698;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }

  .bytes-per-line-control input:focus {
    outline: none;
    border-color: #00c698;
  }

  .view-container {
    flex: 1;
    overflow: hidden;
  }

  h2 {
    color: #00c698;
    margin: 0 0 8px 0;
    font-size: 16px;
  }

  p {
    margin: 8px;
    line-height: 160%;
  }
</style>
