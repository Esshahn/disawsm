<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { loadedFile, config, getFileLoaderInstance } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';

  // Reactive declarations using $derived
  let infoConfig = $derived($config?.window_info);
  let left = $derived(infoConfig?.left ?? 950);
  let top = $derived(infoConfig?.top ?? 50);
  let width = $derived(`${infoConfig?.width ?? 600}px`);
  let height = $derived(`${infoConfig?.height ?? 400}px`);
  let closeable = $derived(infoConfig?.closeable ?? false);
  let resizable = $derived(infoConfig?.resizable ?? true);

  let isDragging = $state(false);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check if it's a PRG file
    if (!file.name.toLowerCase().endsWith('.prg') && !file.name.toLowerCase().endsWith('.bin')) {
      alert('Please drop a .prg or .bin file');
      return;
    }

    const fileLoader = getFileLoaderInstance();
    if (!fileLoader) return;

    const loadedPRG = await fileLoader.loadPRGFromFile(file);
    if (loadedPRG) {
      loadedFile.set(loadedPRG);
    }
  }

  async function handleClick() {
    const fileLoader = getFileLoaderInstance();
    if (!fileLoader) return;

    const loadedPRG = await fileLoader.selectAndLoadPRG();
    if (loadedPRG) {
      loadedFile.set(loadedPRG);
    }
  }

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }
</script>

{#if infoConfig}
<Window
  title="Info"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_info"
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
      <div
        class="drop-zone"
        class:dragging={isDragging}
        role="button"
        tabindex="0"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={handleClick}
        onkeypress={handleKeyPress}
      >
        <div class="drop-icon">📁</div>
        <div class="drop-text">Drop PRG file here or click to browse</div>
      </div>
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

  .drop-zone {
    margin-top: 24px;
    padding: 40px;
    border: 2px dashed #3a3a3a;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.2s ease;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.2);
  }

  .drop-zone:hover {
    border-color: #00c698;
    background: rgba(0, 198, 152, 0.05);
  }

  .drop-zone.dragging {
    border-color: #00c698;
    background: rgba(0, 198, 152, 0.15);
    border-style: solid;
  }

  .drop-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .drop-text {
    font-size: 14px;
    color: #888888;
    font-family: 'Quicksand', sans-serif;
  }

  .drop-zone.dragging .drop-text {
    color: #00c698;
  }
</style>
