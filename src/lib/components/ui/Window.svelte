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
    <span class="dialog-title">{title}</span>
    {#if closeable}
      <button class="window-close-button" onclick={handleClose}>×</button>
    {/if}
  </div>

  <div class="dialog-content">
    {@render children?.()}
  </div>

  {#if resizable}
    <div class="resize-handle" onmousedown={handleResizeMouseDown}></div>
  {/if}
</div>

<style>
  /* Component-specific styles - base styles are in stylesheet.css */
  /* All base .dialog-wrapper, .dialog-titlebar, .dialog-title, .window-close-button,
     .dialog-content, and .resize-handle styles are now in public/css/stylesheet.css */
</style>
