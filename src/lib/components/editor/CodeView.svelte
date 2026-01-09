<script lang="ts">
  import { onMount } from 'svelte';
  import { disassemble, type DisassembledLine } from '$lib/services/disassembler';
  import VirtualScroller from '$lib/components/ui/VirtualScroller.svelte';
  import JumpToAddress from '$lib/components/ui/JumpToAddress.svelte';
  import { toHex } from '$lib/utils/format';

  let {
    bytes,
    startAddress
  }: {
    bytes: Uint8Array;
    startAddress: number;
  } = $props();

  let hoveredLineIndex = $state<number | null>(null);
  let disassembledLines = $state<DisassembledLine[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let scrollToLineIndex = $state<number | undefined>(undefined);

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

  // Load disassembly on mount only
  onMount(async () => {
    try {
      isLoading = true;
      error = null;
      const lines = await disassemble(bytes, startAddress);
      disassembledLines = lines;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  });

  function handleJump(targetAddress: number) {
    // Find the line with this address
    const lineIndex = disassembledLines.findIndex(line => line.address === targetAddress);

    if (lineIndex === -1) {
      // Address not found - find closest address
      const closestIndex = disassembledLines.findIndex(line => line.address > targetAddress);

      if (closestIndex === -1) {
        // Address is beyond last instruction
        console.warn(`Address $${toHex(targetAddress, 4)} not found in disassembled code`);
        return;
      }

      // Jump to closest line
      scrollToLineIndex = Math.max(0, closestIndex - 1);
    } else {
      scrollToLineIndex = lineIndex;
    }

    // Reset after a brief moment to allow future jumps to same line
    setTimeout(() => {
      scrollToLineIndex = undefined;
    }, 100);
  }
</script>

<div class="code-viewer">


  {#if isLoading}
    <div class="loading">Loading disassembly...</div>
  {:else if error}
    <div class="loading">Error: {error}</div>
  {:else}
    <JumpToAddress onjump={handleJump} />

      <div class="code-header">
    <span class="code-header-addr">Addr</span>
    <span class="code-header-bytes">Bytes</span>
    <span class="code-header-instruction">Instruction</span>
  </div>

    <VirtualScroller
      items={disassembledLines}
      itemHeight={LINE_HEIGHT}
      containerHeight="calc(100% - 90px)"
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
