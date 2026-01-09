<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import CodeView from './CodeView.svelte';
  import { loadedFile, config } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';

  // Reactive declarations using $derived
  let codeviewConfig = $derived($config?.window_codeview);
  let left = $derived(codeviewConfig?.left ?? 950);
  let top = $derived(codeviewConfig?.top ?? 50);
  let width = $derived(`${codeviewConfig?.width ?? 600}px`);
  let height = $derived(`${codeviewConfig?.height ?? 400}px`);
  let closeable = $derived(codeviewConfig?.closeable ?? false);
  let resizable = $derived(codeviewConfig?.resizable ?? true);
</script>

{#if codeviewConfig}
<Window
  title="Code View"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_codeview"
>
  {#if $loadedFile}
    <div class="codeview-content">
      <div class="codeview-header">
        <h2>Disassembly: {$loadedFile.name}</h2>
        <div class="file-info">
          <span>Start: ${toHex($loadedFile.startAddress, 4)}</span>
          <span>End: ${toHex($loadedFile.startAddress + $loadedFile.bytes.length - 1, 4)}</span>
          <span>Size: {$loadedFile.bytes.length} bytes</span>
        </div>
      </div>
      <div class="code-viewer-container">
        <CodeView bytes={$loadedFile.bytes} startAddress={$loadedFile.startAddress} />
      </div>
    </div>
  {:else}
    <div class="codeview-content" style="padding: 20px;">
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file for disassembly.</p>
    </div>
  {/if}
</Window>
{/if}

<style>
  .codeview-content {
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .codeview-header {
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

  .code-viewer-container {
    flex: 1;
    overflow: hidden;
  }

  p {
    margin: 8px;
    line-height: 160%;
  }
</style>
