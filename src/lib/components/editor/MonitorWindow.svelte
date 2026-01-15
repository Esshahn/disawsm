<script lang="ts">
  import { onMount } from 'svelte';
  import Window from '$lib/components/ui/Window.svelte';
  import { loadedFile, config } from '$lib/stores/app';
  import { toHex } from '$lib/utils/format';
  import { disassemble, type DisassembledLine } from '$lib/services/disassembler';
  import { loadPetsciiCharset, getPetsciiCharPosition } from '$lib/services/petsciiCharset';
  import { loadSyntaxColors, highlightInstruction, type SyntaxColors } from '$lib/services/syntaxHighlight';

  // Command line state
  let commandInput = $state('');
  let lastAddress = $state<number | null>(null);
  const BYTES_PER_LINE = 16;
  const LINES_TO_SHOW = 20;

  // PETSCII charset
  let spriteSheetUrl = $state<string | null>(null);
  let charsetLoaded = $state(false);
  let syntaxColors = $state<SyntaxColors | null>(null);

  onMount(async () => {
    try {
      spriteSheetUrl = await loadPetsciiCharset();
      charsetLoaded = true;
      syntaxColors = await loadSyntaxColors();
    } catch (error) {
      console.error('Failed to load PETSCII charset or syntax colors:', error);
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
  } | {
    type: 'command';
    text: string;
  } | {
    type: 'error';
    message: string;
  } | {
    type: 'help';
  } | {
    type: 'search-results';
    addresses: number[];
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

  async function showDisassembly(startAddr: number, endAddr?: number) {
    if (!$loadedFile) return;

    // Calculate byte offset from start address
    const byteOffset = startAddr - $loadedFile.startAddress;
    const fileEndAddress = $loadedFile.startAddress + $loadedFile.bytes.length - 1;

    if (byteOffset < 0 || byteOffset >= $loadedFile.bytes.length) {
      history.push({
        type: 'error',
        message: `${toHex(startAddr, 4)} is not within ${toHex($loadedFile.startAddress, 4)}-${toHex(fileEndAddress, 4)}`
      });
      return;
    }

    // Determine how many bytes to disassemble
    let sliceLength: number;
    if (endAddr !== undefined) {
      // Range specified: disassemble from startAddr to endAddr
      const endOffset = endAddr - $loadedFile.startAddress;
      if (endOffset < byteOffset || endOffset >= $loadedFile.bytes.length) {
        history.push({
          type: 'error',
          message: `${toHex(endAddr, 4)} is not within ${toHex($loadedFile.startAddress, 4)}-${toHex(fileEndAddress, 4)}`
        });
        return;
      }
      sliceLength = Math.min(endOffset - byteOffset + 1, $loadedFile.bytes.length - byteOffset);
    } else {
      // No range: show ~20 instructions
      sliceLength = Math.min(60, $loadedFile.bytes.length - byteOffset);
    }

    const bytesSlice = $loadedFile.bytes.slice(byteOffset, byteOffset + sliceLength);

    // Disassemble the slice
    const lines = await disassemble(bytesSlice, startAddr);

    // If range specified, show all lines; otherwise limit to N lines
    const displayLines = endAddr !== undefined ? lines : lines.slice(0, LINES_TO_SHOW);

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

  function showMemory(startAddr: number, endAddr?: number) {
    if (!$loadedFile) return;

    // Calculate byte offset from start address
    const byteOffset = startAddr - $loadedFile.startAddress;
    const fileEndAddress = $loadedFile.startAddress + $loadedFile.bytes.length - 1;

    if (byteOffset < 0 || byteOffset >= $loadedFile.bytes.length) {
      history.push({
        type: 'error',
        message: `${toHex(startAddr, 4)} is not within ${toHex($loadedFile.startAddress, 4)}-${toHex(fileEndAddress, 4)}`
      });
      return;
    }

    // Determine how many bytes to show
    let totalBytes: number;
    if (endAddr !== undefined) {
      // Range specified
      const endOffset = endAddr - $loadedFile.startAddress;
      if (endOffset < byteOffset || endOffset >= $loadedFile.bytes.length) {
        history.push({
          type: 'error',
          message: `${toHex(endAddr, 4)} is not within ${toHex($loadedFile.startAddress, 4)}-${toHex(fileEndAddress, 4)}`
        });
        return;
      }
      totalBytes = endOffset - byteOffset + 1;
    } else {
      // No range: show N lines
      totalBytes = Math.min(LINES_TO_SHOW * BYTES_PER_LINE, $loadedFile.bytes.length - byteOffset);
    }

    // Create data lines
    const lines: {address: number, hexBytes: HexByte[]}[] = [];
    const numLines = Math.ceil(totalBytes / BYTES_PER_LINE);

    for (let i = 0; i < numLines; i++) {
      const lineOffset = byteOffset + (i * BYTES_PER_LINE);
      if (lineOffset >= $loadedFile.bytes.length) break;

      const addr = startAddr + (i * BYTES_PER_LINE);
      const hexBytes: HexByte[] = [];

      const bytesInLine = Math.min(BYTES_PER_LINE, totalBytes - (i * BYTES_PER_LINE));
      for (let j = 0; j < bytesInLine; j++) {
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

  function parseAddress(addressStr: string): number | null {
    const cleanAddr = addressStr.replace(/^(0x|\$)/, '');
    const addr = parseInt(cleanAddr, 16);
    return isNaN(addr) ? null : addr;
  }

  function huntBytes(startAddr: number, endAddr: number, searchBytes: number[]) {
    if (!$loadedFile || searchBytes.length === 0) return;

    const startOffset = startAddr - $loadedFile.startAddress;
    const endOffset = endAddr - $loadedFile.startAddress;

    if (startOffset < 0 || endOffset >= $loadedFile.bytes.length || startOffset > endOffset) {
      const fileEndAddress = $loadedFile.startAddress + $loadedFile.bytes.length - 1;
      history.push({
        type: 'error',
        message: `Invalid range: ${toHex(startAddr, 4)}-${toHex(endAddr, 4)} (file: ${toHex($loadedFile.startAddress, 4)}-${toHex(fileEndAddress, 4)})`
      });
      return;
    }

    const matches: number[] = [];

    // Search for the byte sequence
    for (let i = startOffset; i <= endOffset - searchBytes.length + 1; i++) {
      let found = true;
      for (let j = 0; j < searchBytes.length; j++) {
        if ($loadedFile.bytes[i + j] !== searchBytes[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        matches.push($loadedFile.startAddress + i);
      }
    }

    history.push({
      type: 'search-results',
      addresses: matches
    });
  }

  function executeCommand(cmd: string) {
    if (!$loadedFile) return;

    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add command to history
    history.push({
      type: 'command',
      text: trimmed
    });

    const lowerCmd = trimmed.toLowerCase();
    const parts = lowerCmd.split(/\s+/);
    const command = parts[0];
    const arg1 = parts[1];
    const arg2 = parts[2];

    if (command === 'd') {
      // Disassemble command
      if (arg1 === 'all') {
        // d all - show entire file
        showDisassembly($loadedFile.startAddress, $loadedFile.startAddress + $loadedFile.bytes.length - 1);
      } else if (arg1 && arg2) {
        // d START END - show range
        const startAddr = parseAddress(arg1);
        const endAddr = parseAddress(arg2);
        if (startAddr !== null && endAddr !== null) {
          showDisassembly(startAddr, endAddr);
        }
      } else if (arg1) {
        // d ADDRESS - show from address
        const addr = parseAddress(arg1);
        if (addr !== null) {
          showDisassembly(addr);
        }
      } else {
        // d - continue from last address
        const addr = lastAddress ?? $loadedFile.startAddress;
        showDisassembly(addr);
      }
    } else if (command === 'm') {
      // Memory/data command
      if (arg1 === 'all') {
        // m all - show entire file
        showMemory($loadedFile.startAddress, $loadedFile.startAddress + $loadedFile.bytes.length - 1);
      } else if (arg1 && arg2) {
        // m START END - show range
        const startAddr = parseAddress(arg1);
        const endAddr = parseAddress(arg2);
        if (startAddr !== null && endAddr !== null) {
          showMemory(startAddr, endAddr);
        }
      } else if (arg1) {
        // m ADDRESS - show from address
        const addr = parseAddress(arg1);
        if (addr !== null) {
          showMemory(addr);
        }
      } else {
        // m - continue from last address
        const addr = lastAddress ?? $loadedFile.startAddress;
        showMemory(addr);
      }
    } else if (command === 'f' || command === 'find') {
      // Find/search command
      // Parse arguments: f [start] [end] byte1 [byte2 ...]
      // Addresses must be 4 hex digits, bytes are 1-2 hex digits
      const args = parts.slice(1);

      if (args.length === 0) {
        history.push({
          type: 'error',
          message: 'Find requires at least one byte to search for'
        });
        return;
      }

      const searchBytes: number[] = [];
      let startAddr = $loadedFile.startAddress;
      let endAddr = $loadedFile.startAddress + $loadedFile.bytes.length - 1;
      let argIndex = 0;

      // Check if first two args are 4-digit addresses
      if (args.length >= 3) {
        const firstClean = args[0].replace(/^(0x|\$)/, '');
        const secondClean = args[1].replace(/^(0x|\$)/, '');

        // Addresses must be exactly 4 hex digits (or have 0x/$ prefix + 4 digits)
        if (firstClean.length === 4 && secondClean.length === 4) {
          const firstAddr = parseAddress(args[0]);
          const secondAddr = parseAddress(args[1]);

          if (firstAddr !== null && secondAddr !== null) {
            // First two args are start and end addresses
            startAddr = firstAddr;
            endAddr = secondAddr;
            argIndex = 2;
          }
        }
      }

      // Parse remaining args as bytes (1-2 hex digits)
      for (let i = argIndex; i < args.length; i++) {
        const cleanByte = args[i].replace(/^(0x|\$)/, '');

        // Bytes must be 1-2 hex digits
        if (cleanByte.length > 2) {
          history.push({
            type: 'error',
            message: `Invalid byte value: ${args[i]} (bytes must be 1-2 hex digits, addresses must be 4 digits)`
          });
          return;
        }

        const byte = parseInt(cleanByte, 16);
        if (isNaN(byte) || byte < 0 || byte > 255) {
          history.push({
            type: 'error',
            message: `Invalid byte value: ${args[i]}`
          });
          return;
        }
        searchBytes.push(byte);
      }

      if (searchBytes.length === 0) {
        history.push({
          type: 'error',
          message: 'Find requires at least one byte to search for'
        });
        return;
      }

      huntBytes(startAddr, endAddr, searchBytes);
    } else if (command === 'h' || command === 'help') {
      // Help command
      history.push({ type: 'help' });
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

  // Initialize with help text when monitor first opens
  $effect(() => {
    if ($loadedFile && history.length === 0) {
      history.push({ type: 'help' });
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
        {#each history as entry}
          {#if entry.type === 'code'}
            <!-- Code view -->
            <div class="code-display">
              {#each entry.lines as line}
                <div class="code-line">
                  <span class="code-addr">{toHex(line.address, 4)}</span>
                  <span class="code-bytes">{line.bytes.map(b => toHex(b, 2)).join(' ')}</span>
                  <span class="code-instruction">
                    {#if syntaxColors}
                      {@const tokens = highlightInstruction(line.instruction, syntaxColors)}
                      {#each tokens as token}
                        <span style="color: {token.color}">{token.text}</span>
                      {/each}
                    {:else}
                      {line.instruction}
                    {/if}
                  </span>
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
                    {#each Array(BYTES_PER_LINE - line.hexBytes.length) as _, idx}
                      <span
                        class="hex-byte hex-byte-empty"
                        class:gap-after-8={(line.hexBytes.length + idx + 1) % 8 === 0 && (line.hexBytes.length + idx) < BYTES_PER_LINE - 1}
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
                      {#each Array(BYTES_PER_LINE - line.hexBytes.length) as _}
                        <span class="petscii-char petscii-empty"></span>
                      {/each}
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          {:else if entry.type === 'command'}
            <!-- Command echo -->
            <div class="command-echo">
              <span class="command-prompt">></span>
              <span class="command-text">{entry.text}</span>
            </div>
          {:else if entry.type === 'error'}
            <!-- Error message -->
            <div class="error-message">
              {entry.message}
            </div>
          {:else if entry.type === 'help'}
            <!-- Help text -->
            <div class="help-text">
              <div class="help-title">Monitor Commands:</div>
              <div class="help-command"><span class="help-cmd">d</span> - continue disassembly from last address</div>
              <div class="help-command"><span class="help-cmd">d [ADDR]</span> - disassemble from address <span class="help-example">ex: d c000</span></div>
              <div class="help-command"><span class="help-cmd">d [START] [END]</span> - disassemble range <span class="help-example">ex: d c000 c100</span></div>
              <div class="help-command"><span class="help-cmd">d all</span> - disassemble entire file</div>
              <div class="help-command"><span class="help-cmd">m</span> - continue memory view from last address</div>
              <div class="help-command"><span class="help-cmd">m [ADDR]</span> - show memory from address <span class="help-example">ex: m 1000</span></div>
              <div class="help-command"><span class="help-cmd">m [START] [END]</span> - show memory range <span class="help-example">ex: m 1000 10ff</span></div>
              <div class="help-command"><span class="help-cmd">m all</span> - show entire file memory</div>
              <div class="help-command"><span class="help-cmd">f [BYTES]</span> - search entire file for byte sequence <span class="help-example">ex: f a9 00</span></div>
              <div class="help-command"><span class="help-cmd">f [START] [END] [BYTES]</span> - search range for byte sequence <span class="help-example">ex: f 1000 1fff 8d 14 03</span></div>
              <div class="help-command"><span class="help-cmd">h</span> - show this help</div>
            </div>
          {:else if entry.type === 'search-results'}
            <!-- Search results -->
            <div class="search-results">
              {#if entry.addresses.length === 0}
                <div class="search-no-results">No matches found</div>
              {:else}
                {#each entry.addresses as addr}
                  <div class="search-result">{toHex(addr, 4)}</div>
                {/each}
              {/if}
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
  /* Override the global body/div font rule for monitor content */
  .monitor-content,
  .monitor-content div,
  .monitor-content p,
  .monitor-content span {
    font-family: 'Courier New', monospace;
  }

  .monitor-content {
    color: #ffffff;
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

  /* Code display */
  .code-display,
  .data-display {
    font-size: 13px;
  }

  .code-line,
  .data-line {
    display: flex;
    gap: 16px;
    line-height: 160%;
  }

  .code-line:hover,
  .data-line:hover {
    background: rgba(0, 198, 152, 0.1);
  }

  .code-addr,
  .data-addr {
    color: #00c698;
    width: 45px;
    flex-shrink: 0;
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
  .data-hex {
    display: flex;
    flex-shrink: 0;
    gap: 0.5ch;
    font-variant-numeric: tabular-nums;
  }

  .hex-byte {
    color: #ffffff;
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

  /* Command echo in history */
  .command-echo {
    display: flex;
    gap: 8px;
    margin: 12px 0;
    color: #00c698;
  }

  .command-prompt {
    color: #00c698;
    font-weight: bold;
  }

  .command-text {
    color: #00c698;
  }

  /* Error message */
  .error-message {
    color: #ff6b6b;
    margin: 8px 0;
  }

  /* Help text */
  .help-text {
    margin: 12px 0;
    color: #888888;
  }

  .help-title {
    color: #00c698;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .help-command {
    margin: 4px 0;
    line-height: 140%;
  }

  .help-cmd {
    color: #ffffff;
    font-weight: bold;
  }

  .help-example {
    color: #666666;
    font-style: italic;
    margin-left: 8px;
  }

  /* Search results */
  .search-results {
    margin: 12px 0;
  }

  .search-result {
    color: #00c698;
    margin: 2px 0;
    line-height: 140%;
  }

  .search-no-results {
    color: #888888;
    font-style: italic;
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
    font-family: 'Courier New', monospace;
  }

  .prompt {
    color: #00c698;
    font-size: 14px;
    font-weight: bold;
  }

  .command-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #00c698;
    font-size: 13px;
    outline: none;
    padding: 4px;
    caret-color: #00c698;
    font-family: 'Courier New', Courier, monospace;
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
