<script lang="ts">
  import { onMount } from 'svelte';
  import Window from '$lib/components/ui/Window.svelte';
  import { loadedFile, config } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';
  import { disassemble, type DisassembledLine } from '$lib/services/disassembler';
  import { loadPetsciiCharset, getPetsciiCharPosition } from '$lib/services/petsciiCharset';

  // Command line state
  let commandInput = $state('');
  let lastAddress = $state<number | null>(null);
  let lastCommand = $state<'d' | 'm' | null>(null);
  let bytesPerLine = $state(16);

  // PETSCII charset
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

  // History of all outputs
  interface HexByte {
    value: number;
    index: number; // Index within the line (0-15)
  }

  type HistoryEntry = {
    type: 'code';
    lines: DisassembledLine[];
  } | {
    type: 'data';
    lines: {address: number, hexBytes: HexByte[]}[];
  };

  let history = $state<HistoryEntry[]>([]);

  // Reactive declarations using $derived
  let monitorConfig = $derived($config?.window_monitor);
  let left = $derived(monitorConfig?.left ?? 210);
  let top = $derived(monitorConfig?.top ?? 50);
  let width = $derived(`${monitorConfig?.width ?? 800}px`);
  let height = $derived(`${monitorConfig?.height ?? 600}px`);
  let closeable = $derived(monitorConfig?.closeable ?? true);
  let resizable = $derived(monitorConfig?.resizable ?? true);

  async function showDisassembly(startAddr: number) {
    if (!$loadedFile) return;

    // Calculate byte offset from start address
    const byteOffset = startAddr - $loadedFile.startAddress;
    if (byteOffset < 0 || byteOffset >= $loadedFile.bytes.length) {
      return;
    }

    // Extract a slice of bytes starting from the target address
    // We'll take enough bytes to get ~20 instructions (approximately 60 bytes should be enough)
    const sliceLength = Math.min(60, $loadedFile.bytes.length - byteOffset);
    const bytesSlice = $loadedFile.bytes.slice(byteOffset, byteOffset + sliceLength);

    // Disassemble the slice
    const lines = await disassemble(bytesSlice, startAddr);

    // Take only the first 20 lines
    const displayLines = lines.slice(0, 20);

    // Add to history
    history.push({
      type: 'code',
      lines: displayLines
    });

    // Update lastAddress to the address AFTER the last instruction shown
    if (displayLines.length > 0) {
      const lastLine = displayLines[displayLines.length - 1];
      lastAddress = lastLine.address + lastLine.bytes.length;
    }

    // Trigger reactivity
    history = history;
  }

  function showMemory(startAddr: number) {
    if (!$loadedFile) return;

    // Calculate byte offset from start address
    const byteOffset = startAddr - $loadedFile.startAddress;
    if (byteOffset < 0 || byteOffset >= $loadedFile.bytes.length) {
      return;
    }

    // Create 20 lines of data
    const lines: {address: number, hexBytes: HexByte[]}[] = [];
    const totalLines = 20;

    for (let i = 0; i < totalLines; i++) {
      const lineOffset = byteOffset + (i * bytesPerLine);
      if (lineOffset >= $loadedFile.bytes.length) break;

      const addr = startAddr + (i * bytesPerLine);
      const hexBytes: HexByte[] = [];

      for (let j = 0; j < bytesPerLine; j++) {
        const idx = lineOffset + j;
        if (idx < $loadedFile.bytes.length) {
          hexBytes.push({
            value: $loadedFile.bytes[idx],
            index: j
          });
        }
      }

      lines.push({ address: addr, hexBytes: hexBytes });
    }

    // Add to history
    history.push({
      type: 'data',
      lines: lines
    });

    // Update lastAddress to the address AFTER the last byte shown
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      lastAddress = lastLine.address + lastLine.hexBytes.length;
    }

    // Trigger reactivity
    history = history;
  }

  function executeCommand(cmd: string) {
    if (!$loadedFile) return;

    const trimmed = cmd.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0) return;

    const command = parts[0];

    if (command === 'd') {
      // Disassemble command
      if (parts[1]) {
        // d ADDRESS - jump to specific address
        const cleanAddr = parts[1].replace(/^(0x|\$)/, '');
        const addr = parseInt(cleanAddr, 16);

        if (!isNaN(addr)) {
          lastCommand = 'd';
          showDisassembly(addr);
        }
      } else {
        // d - continue from last address
        if (lastAddress !== null) {
          lastCommand = 'd';
          showDisassembly(lastAddress);
        } else {
          // First time, start from beginning
          lastCommand = 'd';
          showDisassembly($loadedFile.startAddress);
        }
      }
    } else if (command === 'm') {
      // Memory/data command
      if (parts[1]) {
        // m ADDRESS - jump to specific address
        const cleanAddr = parts[1].replace(/^(0x|\$)/, '');
        const addr = parseInt(cleanAddr, 16);

        if (!isNaN(addr)) {
          lastCommand = 'm';
          showMemory(addr);
        }
      } else {
        // m - continue from last address
        if (lastAddress !== null) {
          lastCommand = 'm';
          showMemory(lastAddress);
        } else {
          // First time, start from beginning
          lastCommand = 'm';
          showMemory($loadedFile.startAddress);
        }
      }
    }
  }

  function handleCommandKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      executeCommand(commandInput);
      commandInput = '';
    }
  }

  // Reference to display area for auto-scrolling
  let displayAreaElement = $state<HTMLDivElement | undefined>(undefined);

  // Initialize with disassembly from start address when file loads
  $effect(() => {
    if ($loadedFile && history.length === 0) {
      showDisassembly($loadedFile.startAddress);
    }
  });

  // Auto-scroll to bottom when history updates
  $effect(() => {
    if (history.length > 0 && displayAreaElement) {
      // Wait for DOM update, then scroll to bottom
      setTimeout(() => {
        if (displayAreaElement) {
          displayAreaElement.scrollTop = displayAreaElement.scrollHeight;
        }
      }, 0);
    }
  });
</script>

{#if monitorConfig}
<Window
  title="Monitor"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_monitor"
>
  {#if $loadedFile}
    <div class="monitor-content">
      <!-- Display area with history -->
      <div class="display-area" bind:this={displayAreaElement}>
        {#each history as entry, idx}
          {#if entry.type === 'code'}
            <!-- Code view -->
            <div class="code-display">
              {#each entry.lines as line}
                <div class="code-line">
                  <span class="code-addr">{toHex(line.address, 4)}</span>
                  <span class="code-bytes">{line.bytes.map(b => toHex(b, 2)).join(' ')}</span>
                  <span class="code-instruction">{line.instruction}</span>
                </div>
              {/each}
            </div>
          {:else if entry.type === 'data'}
            <!-- Data view -->
            <div class="data-display">
              {#each entry.lines as line}
                <div class="data-line">
                  <span class="data-addr">{toHex(line.address, 4)}</span>
                  <span class="data-hex">
                    {#each line.hexBytes as hexByte}
                      <span
                        class="hex-byte"
                        class:gap-after-8={(hexByte.index + 1) % 8 === 0 && hexByte.index < line.hexBytes.length - 1}
                      >
                        {toHex(hexByte.value, 2)}
                      </span>
                    {/each}
                    <!-- Fill remaining space with empty placeholders to keep PETSCII column aligned -->
                    {#each Array(bytesPerLine - line.hexBytes.length) as _, idx}
                      <span
                        class="hex-byte hex-byte-empty"
                        class:gap-after-8={(line.hexBytes.length + idx + 1) % 8 === 0 && (line.hexBytes.length + idx) < bytesPerLine - 1}
                      >
                        &nbsp;&nbsp;
                      </span>
                    {/each}
                  </span>
                  <span class="data-petscii">
                    {#if charsetLoaded && spriteSheetUrl}
                      {#each line.hexBytes as hexByte}
                        <span
                          class="petscii-char"
                          style="background-image: url({spriteSheetUrl}); background-position: {getPetsciiCharPosition(hexByte.value)}"
                        ></span>
                      {/each}
                      <!-- Fill remaining space with empty placeholders -->
                      {#each Array(bytesPerLine - line.hexBytes.length) as _}
                        <span class="petscii-char petscii-empty"></span>
                      {/each}
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      </div>

      <!-- Command line interface -->
      <div class="command-line">
        <span class="prompt">></span>
        <input
          type="text"
          bind:value={commandInput}
          onkeydown={handleCommandKeydown}
          class="command-input"
          placeholder="Enter command (d/m ADDRESS or d/m to continue)"
        />
      </div>
    </div>
  {:else}
    <div class="monitor-content" style="padding: 20px;">
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file.</p>
    </div>
  {/if}
</Window>
{/if}

<style>
  .monitor-content {
    color: #ffffff;
    font-family: 'Courier New', monospace;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .display-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
    background: #0a0a0a;
  }

  /* Separator between history entries */
  .with-separator {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #2a2a2a;
  }

  /* Code display */
  .code-display {
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }

  .code-line {
    display: flex;
    gap: 16px;
    line-height: 160%;
  }

  .code-line:hover {
    background: rgba(0, 198, 152, 0.1);
  }

  .code-addr {
    color: #00c698;
    width: 45px;
    flex-shrink: 0;
    font-family: 'Courier New', monospace;
  }

  .code-bytes {
    color: #888888;
    width: 80px;
    flex-shrink: 0;
  }

  .code-instruction {
    color: #ffffff;
    flex: 1;
  }

  /* Data display */
  .data-display {
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }

  .data-line {
    display: flex;
    gap: 16px;
    line-height: 160%;
  }

  .data-line:hover {
    background: rgba(0, 198, 152, 0.1);
  }

  .data-addr {
    color: #00c698;
    width: 45px;
    flex-shrink: 0;
    font-family: 'Courier New', monospace;
  }

  .data-hex {
    display: flex;
    flex-shrink: 0;
    gap: 0.5ch;
    font-family: 'Courier New', monospace;
    font-variant-numeric: tabular-nums;
  }

  .hex-byte {
    color: #ffffff;
    font-family: 'Courier New', monospace;
  }

  .hex-byte.gap-after-8 {
    margin-right: 0.5ch;
  }

  /* Empty hex byte placeholder - no interaction */
  .hex-byte-empty {
    color: transparent;
    cursor: default;
    pointer-events: none;
  }

  .data-petscii {
    display: flex;
    gap: 1px;
    flex-shrink: 0;
    font-family: 'Courier New', monospace;
    align-items: center;
  }

  .petscii-char {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-repeat: no-repeat;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    flex-shrink: 0;
    vertical-align: middle;
  }

  /* Empty PETSCII placeholder - no display */
  .petscii-empty {
    cursor: default;
  }

  /* Command line */
  .command-line {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #1a1a1a;
    border-top: 1px solid #2a2a2a;
    flex-shrink: 0;
  }

  .prompt {
    color: #00c698;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: bold;
  }

  .command-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    outline: none;
    padding: 4px;
    caret-color: #00c698;
  }

  .command-input::placeholder {
    color: #555555;
    font-style: italic;
  }

  h2 {
    color: #00c698;
    margin: 0 0 8px 0;
    font-size: 16px;
  }

  p {
    margin: 8px;
    line-height: 160%;
  }
</style>
