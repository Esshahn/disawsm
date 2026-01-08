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

  interface HexLine {
    address: string;
    hexBytes: string;
    petsciiBytes: number[]; // Array of byte values for PETSCII display
  }

  function formatHexDump(): HexLine[] {
    const lines: HexLine[] = [];

    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const addr = startAddress + i;
      const lineBytes = bytes.slice(i, Math.min(i + bytesPerLine, bytes.length));

      // Format hex bytes with grouping of 8 bytes
      let hexBytes = '';
      for (let j = 0; j < bytesPerLine; j++) {
        if (j < lineBytes.length) {
          hexBytes += toHex(lineBytes[j], 2);
        } else {
          hexBytes += '  '; // Empty space for missing bytes
        }

        // Add space after each byte, and extra gap after every 8 bytes
        if (j < bytesPerLine - 1) {
          if ((j + 1) % 8 === 0) {
            hexBytes += '  '; // Double space gap between groups
          } else {
            hexBytes += ' '; // Single space between bytes
          }
        }
      }

      // Store byte values for PETSCII rendering
      const petsciiBytes = Array.from(lineBytes);

      lines.push({
        address: toHex(addr, 4),
        hexBytes: hexBytes,
        petsciiBytes: petsciiBytes,
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
        <span class="hex-bytes">{line.hexBytes}</span>
        <span class="hex-petscii">
          {#if charsetLoaded && spriteSheetUrl}
            {#each line.petsciiBytes as byte}
              <span
                class="petscii-char"
                style="background-image: url({spriteSheetUrl}); background-position: {getPetsciiCharPosition(byte)};"
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

  .hex-bytes {
    flex: 1;
    min-width: 200px;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', Courier, monospace !important;
    white-space: pre;
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
  }

  .loading {
    color: #aaaaaa;
    font-size: 11px;
    font-style: italic;
  }
</style>
