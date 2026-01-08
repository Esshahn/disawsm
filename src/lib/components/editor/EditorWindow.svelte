<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import HexViewer from './HexViewer.svelte';
  import { loadedFile, config } from '$lib/stores/app';

  function toHex(num: number, digits: number): string {
    return num.toString(16).padStart(digits, '0').toLowerCase();
  }
</script>

<Window
  title="Editor"
  left={$config.window_editor?.left || 210}
  top={$config.window_editor?.top || 50}
  width="600px"
  height="400px"
  closeable={$config.window_editor?.closeable || false}
>
  {#if $loadedFile}
    <div class="editor-content">
      <div class="editor-header">
        <h2>File: {$loadedFile.name}</h2>
        <div class="file-info">
          <span>Start: ${toHex($loadedFile.startAddress, 4)}</span>
          <span>End: ${toHex($loadedFile.startAddress + $loadedFile.bytes.length - 1, 4)}</span>
          <span>Size: {$loadedFile.bytes.length} bytes</span>
        </div>
      </div>
      <div class="hex-viewer-container">
        <HexViewer bytes={$loadedFile.bytes} startAddress={$loadedFile.startAddress} />
      </div>
    </div>
  {:else}
    <div class="editor-content" style="padding: 20px;">
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file.</p>
    </div>
  {/if}
</Window>

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

  .hex-viewer-container {
    flex: 1;
    overflow: hidden;
  }

  p {
    margin: 8px;
    line-height: 160%;
  }
</style>
