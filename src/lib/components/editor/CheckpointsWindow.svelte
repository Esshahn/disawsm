<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { loadedFile, config } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';

  // Reactive declarations using $derived
  let infoConfig = $derived($config?.window_checkpoints);
  let left = $derived(infoConfig?.left ?? 950);
  let top = $derived(infoConfig?.top ?? 50);
  let width = $derived(`${infoConfig?.width ?? 600}px`);
  let height = $derived(`${infoConfig?.height ?? 400}px`);
  let closeable = $derived(infoConfig?.closeable ?? false);
  let resizable = $derived(infoConfig?.resizable ?? true);
</script>

{#if infoConfig}
<Window
  title="Checkpoints"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_checkpoints"
>
  {#if $loadedFile}
    <div class="info-content">
      <div class="info-header">
        <h2>{$loadedFile.name}</h2>
        <div class="file-info">
          <p>Start: ${toHex($loadedFile.startAddress, 4)}</p>
          <p>End: ${toHex($loadedFile.startAddress + $loadedFile.bytes.length - 1, 4)}</p>
          <p>Size: {$loadedFile.bytes.length} bytes</p>
        </div>
      </div>
    </div>
  {:else}
    <div class="info-content" style="padding: 20px;">
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file for disassembly.</p>
    </div>
  {/if}
</Window>
{/if}

<style>
  .info-content {
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .info-header {
    padding: 12px 16px;
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
    font-family: 'Courier New', monospace;
  }


  p {
    margin: 8px;
    line-height: 160%;
  }
</style>
