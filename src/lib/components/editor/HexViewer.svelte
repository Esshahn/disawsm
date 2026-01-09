<script lang="ts">
  import { onMount } from 'svelte';
  import { loadPetsciiCharset, getPetsciiCharPosition } from '$lib/services/petsciiCharset';
  import VirtualScroller from '$lib/components/ui/VirtualScroller.svelte';

  let {
    bytes,
    startAddress,
    bytesPerLine = 16
  }: {
    bytes: Uint8Array;
    startAddress: number;
    bytesPerLine?: number;
  } = $props();

  let spriteSheetUrl = $state<string | null>(null);
  let charsetLoaded = $state(false);
  let hoveredByteIndex = $state<number | null>(null); // Track which byte is being hovered (global index)

  // Line height in pixels - measured from actual rendered content
  const LINE_HEIGHT = 21;

  function getTooltipText(value: number, address: number): string {
    const hexAddr = toHex(address, 4);
    const hexVal = toHex(value, 2);
    return `${hexAddr}: $${hexVal} / ${value}`;
  }

  onMount(async () => {
    try {
      spriteSheetUrl = await loadPetsciiCharset();
      charsetLoaded = true;
    } catch (error) {
      console.error('Failed to load PETSCII charset:', error);
    }
  });

  function toHex(num: number, digits: number): string {
    return num.toString(16).padStart(digits, '0').toLowerCase();
  }

  interface HexByte {
    value: number;
    index: number; // Global byte index
  }

  interface HexLine {
    address: string;
    hexBytes: HexByte[];
    startIndex: number; // Starting byte index for this line
  }

  function formatHexDump(): HexLine[] {
    const lines: HexLine[] = [];

    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const addr = startAddress + i;
      const lineBytes = bytes.slice(i, Math.min(i + bytesPerLine, bytes.length));

      // Create array of HexByte objects with global indices
      const hexBytes: HexByte[] = [];
      for (let j = 0; j < lineBytes.length; j++) {
        hexBytes.push({
          value: lineBytes[j],
          index: i + j, // Global byte index
        });
      }

      lines.push({
        address: toHex(addr, 4),
        hexBytes: hexBytes,
        startIndex: i,
      });
    }

    return lines;
  }

  let hexLines = $derived(formatHexDump());
</script>

<div class="hex-viewer">
  <div class="hex-header">
    <span class="hex-header-addr">Addr</span>
    <span class="hex-header-hex">Hex Dump</span>
    <span class="hex-header-petscii">PETSCII</span>
  </div>

  <VirtualScroller
    items={hexLines}
    itemHeight={LINE_HEIGHT}
    containerHeight="calc(100% - 40px)"
  >
    {#snippet children(line, idx)}
      <div class="hex-line">
        <span class="hex-addr">{line.address}</span>
        <span class="hex-bytes-container">
          {#each line.hexBytes as hexByte, idx}
            <span
              class="hex-byte"
              class:highlighted={hoveredByteIndex === hexByte.index}
              class:gap-after-8={(idx + 1) % 8 === 0 && idx < line.hexBytes.length - 1}
              data-tooltip={getTooltipText(hexByte.value, startAddress + hexByte.index)}
              onmouseenter={() => hoveredByteIndex = hexByte.index}
              onmouseleave={() => hoveredByteIndex = null}
            >
              {toHex(hexByte.value, 2)}
            </span>
          {/each}
        </span>
        <span class="hex-petscii">
          {#if charsetLoaded && spriteSheetUrl}
            {#each line.hexBytes as hexByte}
              <span
                class="petscii-char"
                class:highlighted={hoveredByteIndex === hexByte.index}
                data-tooltip={getTooltipText(hexByte.value, startAddress + hexByte.index)}
                style="background-image: url({spriteSheetUrl}); background-position: {getPetsciiCharPosition(hexByte.value)};"
                onmouseenter={() => hoveredByteIndex = hexByte.index}
                onmouseleave={() => hoveredByteIndex = null}
              ></span>
            {/each}
            <!-- Fill remaining space with empty placeholders -->
            {#each Array(bytesPerLine - line.hexBytes.length) as _}
              <span class="petscii-char petscii-empty"></span>
            {/each}
          {:else}
            <span class="loading">Loading...</span>
          {/if}
        </span>
      </div>
    {/snippet}
  </VirtualScroller>
</div>

<style>
  .hex-viewer {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    background: #1a1a1a;
    color: #ffffff;
    padding: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    contain: layout style paint;
  }

  .hex-header {
    display: flex;
    gap: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
    color: #00c698;
    font-weight: 600;
    flex-shrink: 0;
  }

  .hex-header-addr {
    width: 45px;
    flex-shrink: 0;
  }

  .hex-header-hex {
    flex-shrink: 0;
  }

  .hex-header-petscii {
    flex-shrink: 0;
  }

  .hex-line {
    line-height: 160%;
    display: flex;
    gap: 16px;
    contain: layout style;
  }

  .hex-line:hover {
    background: rgba(0, 198, 152, 0.1);
  }

  .hex-addr {
    color: #00c698;
    width: 45px;
    user-select: none;
    flex-shrink: 0;
    font-family: 'Courier New', Courier, monospace;
  }

  .hex-bytes-container {
    display: flex;
    font-family: 'Courier New', Courier, monospace;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    gap: 0.5ch;
  }

  .hex-byte {
    color: #ffffff;
    cursor: pointer;
    padding: 1px 2px;
    position: relative;
    font-family: inherit;
  }

  .hex-byte.gap-after-8 {
    margin-right: 0.5ch;
  }

  .hex-byte:hover {
    outline: 2px solid rgb(242, 0, 226);
    outline-offset: -2px;
  }

  .hex-byte.highlighted {
    outline: 2px solid rgb(242, 0, 226);
    outline-offset: -2px;
  }

  /* Modern tooltip for hex bytes - only create on hover */
  .hex-byte:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
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

  .hex-byte:hover::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(18, 18, 18, 0.95);
    pointer-events: none;
    z-index: 1000;
  }

  .hex-petscii {
    display: flex;
    gap: 1px;
    align-items: center;
    flex-shrink: 0;
  }

  .petscii-char {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    cursor: pointer;
    position: relative;
  }

  .petscii-char:hover {
    outline: 2px solid rgb(242, 0, 226);
    outline-offset: -2px;
  }

  .petscii-char.highlighted {
    outline: 2px solid rgb(242, 0, 226);
    outline-offset: -2px;
  }

  /* Modern tooltip for PETSCII characters - only create on hover */
  .petscii-char:not(.petscii-empty):hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
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

  .petscii-char:not(.petscii-empty):hover::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(18, 18, 18, 0.95);
    pointer-events: none;
    z-index: 1000;
  }

  /* Empty PETSCII placeholder - no hover effects */
  .petscii-empty {
    cursor: default;
  }

  .petscii-empty:hover {
    outline: none;
  }

  .loading {
    color: #aaaaaa;
    font-size: 11px;
    font-style: italic;
  }
</style>
