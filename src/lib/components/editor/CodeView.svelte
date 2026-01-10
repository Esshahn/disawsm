<script lang="ts">
  import { disassemble, type DisassembledLine } from '$lib/services/disassembler';
  import VirtualScroller from '$lib/components/ui/VirtualScroller.svelte';
  import { toHex } from '$lib/utils/format';

  let {
    bytes,
    startAddress,
    scrollToAddress = undefined
  }: {
    bytes: Uint8Array;
    startAddress: number;
    scrollToAddress?: number | undefined;
  } = $props();

  let hoveredLineIndex = $state<number | null>(null);
  let disassembledLines = $state<DisassembledLine[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  // Line height in pixels - measured from actual rendered content
  const LINE_HEIGHT = 21;

  function getTooltipText(line: DisassembledLine): string {
    const hexAddr = toHex(line.address, 4);
    const bytesHex = line.bytes.map(b => toHex(b, 2)).join(' ');
    return `${hexAddr}: ${bytesHex}`;
  }

  function formatBytes(bytes: number[]): string {
    return bytes.map(b => toHex(b, 2)).join(' ');
  }

  // Re-run disassembly whenever bytes or startAddress changes
  $effect(() => {
    async function loadDisassembly() {
      try {
        isLoading = true;
        error = null;
        hoveredLineIndex = null; // Clear hover state
        const lines = await disassemble(bytes, startAddress);
        disassembledLines = lines;
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
        disassembledLines = [];
      } finally {
        isLoading = false;
      }
    }

    loadDisassembly();
  });

  // Convert scrollToAddress to line index by finding which line contains that address
  let scrollToLineIndex = $derived.by(() => {
    if (scrollToAddress === undefined || disassembledLines.length === 0) {
      return undefined;
    }

    // Find the line that contains or is closest to the target address
    for (let i = 0; i < disassembledLines.length; i++) {
      const line = disassembledLines[i];
      // Check if this instruction starts at or after the target address
      if (line.address >= scrollToAddress) {
        return i;
      }
    }

    // If address is beyond all instructions, scroll to the last line
    return disassembledLines.length - 1;
  });
</script>

<div class="code-viewer">
  {#if isLoading}
    <div class="loading">Loading disassembly...</div>
  {:else if error}
    <div class="loading">Error: {error}</div>
  {:else}

      <div class="code-header">
    <span class="code-header-addr">Addr</span>
    <span class="code-header-bytes">Bytes</span>
    <span class="code-header-instruction">Instruction</span>
  </div>

    <VirtualScroller
      items={disassembledLines}
      itemHeight={LINE_HEIGHT}
      containerHeight="calc(100% - 40px)"
      scrollToIndex={scrollToLineIndex}
    >
      {#snippet children(line, idx)}
        <div
          class="code-line"
          class:highlighted={hoveredLineIndex === idx}
          onmouseenter={() => hoveredLineIndex = idx}
          onmouseleave={() => hoveredLineIndex = null}
        >
          <span class="code-addr">{toHex(line.address, 4)}</span>
          <span
            class="code-bytes"
            data-tooltip={getTooltipText(line)}
          >
            {formatBytes(line.bytes)}
          </span>
          <span class="code-instruction">{line.instruction}</span>
        </div>
      {/snippet}
    </VirtualScroller>
  {/if}
</div>

<style>
  .code-viewer {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #ffffff;
    padding: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    contain: layout style paint;
  }

  .code-header {
    display: flex;
    gap: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 198, 152, 0.3);
    font-weight: bold;
    color: #00c698;
    flex-shrink: 0;
  }

  .code-header-addr {
    width: 45px;
    flex-shrink: 0;
  }

  .code-header-bytes {
    width: 80px;
    flex-shrink: 0;
  }

  .code-header-instruction {
    flex: 1;
  }

  .code-line {
    line-height: 160%;
    display: flex;
    gap: 16px;
    contain: layout style;
  }

  .code-line:hover {
    background: rgba(0, 198, 152, 0.1);
  }

  .code-line.highlighted {
    background: rgba(0, 198, 152, 0.1);
  }

  .code-addr {
    color: #00c698;
    width: 45px;
    user-select: none;
    flex-shrink: 0;
    font-family: 'Courier New', Courier, monospace;
  }

  .code-bytes {
    color: #888888;
    width: 80px;
    flex-shrink: 0;
    font-family: 'Courier New', Courier, monospace;
    position: relative;
    cursor: help;
  }

  .code-bytes:hover {
    color: #aaaaaa;
  }

  /* Tooltip for bytes - only create on hover */
  .code-bytes:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    background: rgba(18, 18, 18, 0.95);
    color: #00c698;
    padding: 6px 10px;
    border-radius: 6px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1000;
    border: 1px solid rgba(0, 198, 152, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .code-bytes:hover::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 10px;
    border: 6px solid transparent;
    border-top-color: rgba(18, 18, 18, 0.95);
    pointer-events: none;
    z-index: 1000;
  }

  .code-instruction {
    color: #ffffff;
    flex: 1;
    font-family: 'Courier New', Courier, monospace;
  }

  .loading {
    color: #888888;
    font-style: italic;
  }
</style>
