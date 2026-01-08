<script lang="ts">
  let {
    bytes,
    startAddress
  }: {
    bytes: Uint8Array;
    startAddress: number;
  } = $props();

  function toHex(num: number, digits: number): string {
    return num.toString(16).padStart(digits, '0').toLowerCase();
  }

  function toAscii(byte: number): string {
    // Display printable ASCII chars, otherwise show a dot
    if (byte >= 0 && byte <= 255) {
      return String.fromCharCode(byte);
    }
    return '.';
  }

  interface HexLine {
    address: string;
    hexBytes: string;
    ascii: string;
  }

  function formatHexDump(): HexLine[] {
    const lines: HexLine[] = [];
    const bytesPerLine = 16;

    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const addr = startAddress + i;
      const lineBytes = bytes.slice(i, Math.min(i + bytesPerLine, bytes.length));

      // Format hex bytes with grouping of 8 (two groups of 8)
      let hexBytes = '';
      for (let j = 0; j < bytesPerLine; j++) {
        if (j < lineBytes.length) {
          hexBytes += toHex(lineBytes[j], 2);
        } else {
          hexBytes += '  '; // Empty space for missing bytes
        }

        // Add space after each byte, and extra gap after every 8 bytes
        if ((j + 1) % 8 === 0 && j < bytesPerLine - 1) {
          hexBytes += '  '; // Double space gap between groups
        } else if (j < bytesPerLine - 1) {
          hexBytes += ' '; // Single space between bytes
        }
      }

      // Format ASCII representation
      let ascii = '';
      for (let j = 0; j < lineBytes.length; j++) {
        ascii += toAscii(lineBytes[j]);
      }

      lines.push({
        address: toHex(addr, 4),
        hexBytes: hexBytes,
        ascii: ascii,
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
    <span class="hex-header-ascii">ASCII</span>
  </div>
  <div class="hex-content">
    {#each hexLines as line}
      <div class="hex-line">
        <span class="hex-addr">{line.address}</span>
        <span class="hex-bytes">{line.hexBytes}</span>
        <span class="hex-ascii">{line.ascii}</span>
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
    min-width: 400px;
  }

  .hex-header-ascii {
    width: 160px;
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
    min-width: 400px;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
    font-family: 'Courier New', Courier, monospace !important;
    white-space: pre;
  }

  .hex-ascii {
    width: 160px;
    color: #aaaaaa;
    font-family: 'Courier New', Courier, monospace !important;
  }
</style>
