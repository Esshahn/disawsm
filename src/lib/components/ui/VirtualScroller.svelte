<script lang="ts" generics="T">
  import { type Snippet } from 'svelte';

  let {
    items,
    itemHeight,
    containerHeight,
    overscan = 3,
    children,
    scrollToIndex = undefined
  }: {
    items: T[];
    itemHeight: number;
    containerHeight: string;
    overscan?: number;
    children: Snippet<[T, number]>;
    scrollToIndex?: number | undefined;
  } = $props();

  let scrollTop = $state(0);
  let viewportElement = $state<HTMLDivElement>();

  // Restore scroll position when items array is replaced
  $effect(() => {
    items; // Track items changes
    if (viewportElement && scrollTop > 0) {
      queueMicrotask(() => {
        if (viewportElement) viewportElement.scrollTop = scrollTop;
      });
    }
  });

  // Calculate visible range
  let visibleRange = $derived.by(() => {
    if (!viewportElement) return { start: 0, end: 0, offsetY: 0 };

    const viewportHeight = viewportElement.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    const offsetY = start * itemHeight;

    return { start, end, offsetY };
  });

  let visibleItems = $derived(
    items.slice(visibleRange.start, visibleRange.end).map((item, i) => ({
      item,
      index: visibleRange.start + i
    }))
  );

  let totalHeight = $derived(items.length * itemHeight);

  function handleScroll(event: Event) {
    scrollTop = (event.target as HTMLDivElement).scrollTop;
  }

  // Watch for scrollToIndex changes and scroll to that item
  $effect(() => {
    if (scrollToIndex !== undefined && viewportElement) {
      const scrollPosition = scrollToIndex * itemHeight;
      viewportElement.scrollTop = scrollPosition;
    }
  });
</script>

<div
  bind:this={viewportElement}
  class="virtual-scroller"
  style="height: {containerHeight}; overflow-y: auto;"
  onscroll={handleScroll}
>
  <div class="virtual-scroller-spacer" style="height: {totalHeight}px;">
    <div class="virtual-scroller-content" style="transform: translateY({visibleRange.offsetY}px);">
      {#each visibleItems as { item, index } (index)}
        {@render children(item, index)}
      {/each}
    </div>
  </div>
</div>

<style>
  .virtual-scroller {
    position: relative;
    contain: strict;
    will-change: scroll-position;
  }

  .virtual-scroller-spacer {
    position: relative;
    width: 100%;
  }

  .virtual-scroller-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    will-change: transform;
  }
</style>
