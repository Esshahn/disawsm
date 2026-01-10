<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { loadedFile, config, getFileLoaderInstance, loadPRGFile } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';

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

    if (!file.name.toLowerCase().endsWith('.prg') && !file.name.toLowerCase().endsWith('.bin')) {
      alert('Please drop a .prg or .bin file');
      return;
    }

    const fileLoader = getFileLoaderInstance();
    if (!fileLoader) return;

    const loadedPRG = await fileLoader.loadPRGFromFile(file);
    if (loadedPRG) {
      loadPRGFile(loadedPRG);
    }
  }

  async function handleClick() {
    const fileLoader = getFileLoaderInstance();
    if (!fileLoader) return;

    const loadedPRG = await fileLoader.selectAndLoadPRG();
    if (loadedPRG) {
      loadPRGFile(loadedPRG);
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
        <h2>{$loadedFile.name}</h2>

        <div class="file-info">
          <span class="label">Start</span>
          <span class="value">
            ${toHex($loadedFile.startAddress, 4)}
          </span>

          <span class="label">End</span>
          <span class="value">
            ${toHex($loadedFile.startAddress + $loadedFile.bytes.length - 1, 4)}
          </span>

          <span class="label">Size</span>
          <span class="value">
            {$loadedFile.bytes.length} bytes
          </span>
        </div>
      </div>
    {:else}
      <div class="info-content">
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
    display: flex;
    flex-direction: column;
    padding: 20px;
    align-items: flex-start;
  }

  h2 {
    color: #00c698;
    margin: 0 0 12px 0;
    font-size: 16px;
    text-align: left;
  }

  .file-info {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 16px;
    row-gap: 6px;

    font-size: 12px;
    font-family: 'Courier New', monospace;
    color: #aaaaaa;
  }

  .label {
    color: #888888;
    min-width: 60px;
  }

  .value {
    color: #e0e0e0;
  }

  .drop-zone {
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
