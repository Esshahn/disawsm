<script lang="ts">
  import { onMount } from 'svelte';
  import { loadPetsciiCharset, getPetsciiCharPosition } from '$lib/services/petsciiCharset';

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
  <div class="hex-content">
    {#each hexLines as line}
      <div class="hex-line">
        <span class="hex-addr">{line.address}</span>
        <span class="hex-bytes-container">
          {#each line.hexBytes as hexByte, idx}
            <span
              class="hex-byte"
              class:highlighted={hoveredByteIndex === hexByte.index}
              onmouseenter={() => hoveredByteIndex = hexByte.index}
              onmouseleave={() => hoveredByteIndex = null}
            >
              {toHex(hexByte.value, 2)}
            </span>
            {#if idx < line.hexBytes.length - 1}
              {#if (idx + 1) % 8 === 0}
                <span class="byte-gap-large"></span>
              {:else}
                <span class="byte-gap"></span>
              {/if}
            {/if}
          {/each}
        </span>
        <span class="hex-petscii">
          {#if charsetLoaded && spriteSheetUrl}
            {#each line.hexBytes as hexByte}
              <span
                class="petscii-char"
                class:highlighted={hoveredByteIndex === hexByte.index}
                style="background-image: url({spriteSheetUrl}); background-position: {getPetsciiCharPosition(hexByte.value)};"
                onmouseenter={() => hoveredByteIndex = hexByte.index}
                onmouseleave={() => hoveredByteIndex = null}
              ></span>
            {/each}
          {:else}
            <span class="loading">Loading...</span>
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>

<style>
  .hex-viewer {
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 13px;
    background: #1a1a1a;
    color: #ffffff;
    padding: 12px;
    overflow: auto;
    height: 100%;
  }

  .hex-header {
    display: flex;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
    margin-bottom: 8px;
    color: #00c698;
    font-weight: 600;
    font-family: 'Courier New', Courier, monospace !important;
  }

  .hex-header-addr {
    width: 45px;
  }

  .hex-header-hex {
    flex: 1;
    min-width: 200px;
  }

  .hex-header-petscii {
    min-width: 80px;
  }

  .hex-content {
    line-height: 160%;
    font-family: 'Courier New', Courier, monospace !important;
  }

  .hex-line {
    display: flex;
    gap: 8px;
    font-family: 'Courier New', Courier, monospace !important;
  }

  .hex-line:hover {
    background: rgba(0, 198, 152, 0.1);
  }

  .hex-addr {
    color: #00c698;
    width: 45px;
    user-select: none;
    font-family: 'Courier New', Courier, monospace !important;
  }

  .hex-bytes-container {
    flex: 1;
    min-width: 200px;
    display: flex;
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', Courier, monospace !important;
  }

  .hex-byte {
    color: #ffffff;
    cursor: pointer;
    padding: 1px 2px;
    border-radius: 2px;
    transition: background-color 0.1s;
  }

  .hex-byte:hover {
     box-shadow: 0 0 0 2px rgb(242, 0, 226);
  }

  .hex-byte.highlighted {
    box-shadow: 0 0 0 2px rgb(242, 0, 226);
  }

  .byte-gap {
    display: inline-block;
    width: 0.5ch;
  }

  .byte-gap-large {
    display: inline-block;
    width: 1ch;
  }

  .hex-petscii {
    min-width: 80px;
    display: flex;
    gap: 1px;
    align-items: center;
    flex-wrap: wrap;
  }

  .petscii-char {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    cursor: pointer;
    border-radius: 2px;
    transition: box-shadow 0.1s;
    position: relative;
  }

  .petscii-char:hover {
    box-shadow: 0 0 0 2px rgb(242, 0, 226);
  }

  .petscii-char.highlighted {
    box-shadow: 0 0 0 2px rgb(242, 0, 226);
  }

  .loading {
    color: #aaaaaa;
    font-size: 11px;
    font-style: italic;
  }
</style>
