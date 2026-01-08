<script lang="ts">
  import { updateWindowConfig } from '$lib/stores/app';

  let {
    title = 'Window',
    left = 50,
    top = 50,
    width = 'auto',
    height = 'auto',
    closeable = false,
    resizable = false,
    windowKey = '',
    children
  }: {
    title?: string;
    left?: number;
    top?: number;
    width?: string;
    height?: string;
    closeable?: boolean;
    resizable?: boolean;
    windowKey?: string;
    children?: any;
  } = $props();

  let windowElement = $state<HTMLDivElement>();
  let isDragging = $state(false);
  let isResizing = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);
  let windowStartX = $state(0);
  let windowStartY = $state(0);
  let resizeStartWidth = $state(0);
  let resizeStartHeight = $state(0);

  // Make position reactive to prop changes
  let currentLeft = $state(left);
  let currentTop = $state(top);
  let currentWidth = $state(width);
  let currentHeight = $state(height);
  let zIndex = $state(100);

  // Update position when props change (e.g., from localStorage)
  $effect(() => {
    currentLeft = left;
    currentTop = top;
    currentWidth = width;
    currentHeight = height;
  });

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
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      currentLeft = windowStartX + deltaX;
      currentTop = windowStartY + deltaY;
    } else if (isResizing) {
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      const newWidth = Math.max(200, resizeStartWidth + deltaX);
      const newHeight = Math.max(100, resizeStartHeight + deltaY);

      currentWidth = `${newWidth}px`;
      currentHeight = `${newHeight}px`;
    }
  }

  function handleMouseUp() {
    if (isDragging && windowKey) {
      // Save new position to config and localStorage
      updateWindowConfig(windowKey, {
        left: currentLeft,
        top: currentTop
      });
    } else if (isResizing && windowKey) {
      // Save new size to config and localStorage
      const widthNum = parseInt(currentWidth);
      const heightNum = parseInt(currentHeight);
      updateWindowConfig(windowKey, {
        width: widthNum,
        height: heightNum
      });
    }
    isDragging = false;
    isResizing = false;
  }

  function handleResizeMouseDown(e: MouseEvent) {
    isResizing = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // Parse current dimensions
    resizeStartWidth = typeof currentWidth === 'string'
      ? parseInt(currentWidth) || 700
      : currentWidth;
    resizeStartHeight = typeof currentHeight === 'string'
      ? parseInt(currentHeight) || 400
      : currentHeight;

    zIndex = Date.now(); // Bring to front
    e.preventDefault();
    e.stopPropagation();
  }

  function handleClose() {
    if (windowKey) {
      updateWindowConfig(windowKey, {
        isOpen: false
      });
    }
  }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
  bind:this={windowElement}
  class="dialog-wrapper"
  style="left: {currentLeft}px; top: {currentTop}px; width: {currentWidth}; height: {currentHeight}; z-index: {zIndex};"
>
  <div class="dialog-titlebar" onmousedown={handleTitleMouseDown}>
    {#if closeable}
      <div class="window-close-button" onclick={handleClose}>×</div>
    {/if}
    <span class="dialog-title">{title}</span>
  </div>

  <div class="dialog-content">
    {@render children?.()}
  </div>

  {#if resizable}
    <div class="resize-handle" onmousedown={handleResizeMouseDown}></div>
  {/if}
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
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.2);
  }

  .dialog-title {
    color: #00c698;
    font-weight: 600;
    font-size: 14px;
    flex: 1;
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
    flex-shrink: 0;
  }

  .window-close-button:hover {
    opacity: 1;
    color: #ff6b6b;
  }

  .dialog-content {
    flex: 1;
    overflow: auto;
    padding: 4px;
    color: #ffffff;
  }

  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.2) 100%);
    border-bottom-right-radius: 4px;
  }

  .resize-handle:hover {
    background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(0,198,152,0.3) 50%, rgba(0,198,152,0.5) 100%);
  }
</style>
