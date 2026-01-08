<script lang="ts">
  let {
    title = 'Window',
    left = 50,
    top = 50,
    width = 'auto',
    height = 'auto',
    closeable = false,
    children
  }: {
    title?: string;
    left?: number;
    top?: number;
    width?: string;
    height?: string;
    closeable?: boolean;
    children?: any;
  } = $props();

  let windowElement = $state<HTMLDivElement>();
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);
  let windowStartX = $state(0);
  let windowStartY = $state(0);
  let currentLeft = $state(left);
  let currentTop = $state(top);
  let zIndex = $state(100);

  function handleTitleMouseDown(e: MouseEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    windowStartX = currentLeft;
    windowStartY = currentTop;
    zIndex = Date.now(); // Bring to front
    e.preventDefault();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    currentLeft = windowStartX + deltaX;
    currentTop = windowStartY + deltaY;
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleClose() {
    // Emit close event if needed
  }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
  bind:this={windowElement}
  class="dialog-wrapper"
  style="left: {currentLeft}px; top: {currentTop}px; width: {width}; height: {height}; z-index: {zIndex};"
>
  <div class="dialog-titlebar" onmousedown={handleTitleMouseDown}>
    <span class="dialog-title">{title}</span>
    {#if closeable}
      <div class="window-close-button" onclick={handleClose}>×</div>
    {/if}
  </div>

  <div class="dialog-content">
    {@render children?.()}
  </div>
</div>

<style>
  /* Use existing CSS classes from stylesheet.css */
  .dialog-wrapper {
    position: absolute;
    background: #121212 url('/ui/bg_glossy.png') 50% top repeat-x;
    border-radius: 4px;
    border: 1px solid #2a2a2a;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    min-width: 200px;
    min-height: 100px;
  }

  .dialog-titlebar {
    border-bottom: 1px solid #141414;
    padding: 4px 12px;
    cursor: move;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
  }

  .dialog-title {
    color: #00c698;
    font-weight: 600;
    font-size: 14px;
  }

  .window-close-button {
    width: 16px;
    height: 16px;
    cursor: pointer;
    opacity: 0.6;
    font-size: 20px;
    line-height: 12px;
    text-align: center;
    color: #aaaaaa;
  }

  .window-close-button:hover {
    opacity: 1;
    color: #ffffff;
  }

  .dialog-content {
    flex: 1;
    overflow: auto;
    padding: 4px;
    color: #ffffff;
  }
</style>
