<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import HexViewer from './HexViewer.svelte';
  import { loadedFile, config } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';

  let bytesPerLine = $state(16);

  // Reactive declarations using $derived
  let editorConfig = $derived($config?.window_editor);
  let left = $derived(editorConfig?.left ?? 210);
  let top = $derived(editorConfig?.top ?? 50);
  let width = $derived(`${editorConfig?.width ?? 700}px`);
  let height = $derived(`${editorConfig?.height ?? 400}px`);
  let closeable = $derived(editorConfig?.closeable ?? false);
  let resizable = $derived(editorConfig?.resizable ?? false);
</script>

{#if editorConfig}
<Window
  title="Editor"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_editor"
>
  {#if $loadedFile}
    <div class="editor-content">
      <div class="editor-header">
        <h2>File: {$loadedFile.name}</h2>
        <div class="file-info">
          <span>Start: ${toHex($loadedFile.startAddress, 4)}</span>
          <span>End: ${toHex($loadedFile.startAddress + $loadedFile.bytes.length - 1, 4)}</span>
          <span>Size: {$loadedFile.bytes.length} bytes</span>
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
        </div>
      </div>
      <div class="hex-viewer-container">
        <HexViewer bytes={$loadedFile.bytes} startAddress={$loadedFile.startAddress} {bytesPerLine} />
      </div>
    </div>
  {:else}
    <div class="editor-content" style="padding: 20px;">
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file.</p>
    </div>
  {/if}
</Window>
{/if}

<style>
  .editor-content {
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .editor-header {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid #2a2a2a;
  }

  h2 {
    color: #00c698;
    margin: 0 0 8px 0;
    font-size: 16px;
  }

  .file-info {
    display: flex;
    gap: 20px;
    font-size: 12px;
    color: #aaaaaa;
  }

  .file-info span {
    font-family: 'Courier New', monospace;
  }

  .bytes-per-line-control {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bytes-per-line-control label {
    color: #aaaaaa;
    font-family: 'Quicksand', sans-serif;
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

  .hex-viewer-container {
    flex: 1;
    overflow: hidden;
    
  }

  p {
    margin: 8px;
    line-height: 160%;
  }
</style>
