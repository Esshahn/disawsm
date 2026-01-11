<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { loadedFile, config, assemblyOutput } from '$lib/stores/app';
  import { entrypoints } from '$lib/stores/entrypoints';
  import { settings } from '$lib/stores/settings';
  import type { AssemblerSyntax } from '$lib/types';
  import { disassembleWithEntrypoints, type DisassembledLine } from '$lib/services/enhancedDisassembler';
  import { formatAsAssembly } from '$lib/services/assemblyExporter';
  import VirtualScroller from '$lib/components/ui/VirtualScroller.svelte';
  import JumpToAddress from '$lib/components/ui/JumpToAddress.svelte';
  import { toHex } from '$lib/utils/format';

  // Load syntax definitions
  let syntaxDefinitions: Record<string, AssemblerSyntax> = {};
  let syntaxLoaded = false;

  async function loadSyntax() {
    if (syntaxLoaded) return;
    const response = await fetch('/json/syntax.json');
    const data = await response.json();
    syntaxDefinitions = data.syntaxes;
    syntaxLoaded = true;
  }

  function getCurrentSyntax(): AssemblerSyntax {
    const syntaxKey = $settings.assemblerSyntax;
    return syntaxDefinitions[syntaxKey] || syntaxDefinitions['acme'] || { name: 'ACME', commentPrefix: ';', labelSuffix: '', pseudoOpcodePrefix: '!' };
  }

  // Reactive declarations using $derived
  let disassemblerConfig = $derived($config?.window_disassembler);
  let left = $derived(disassemblerConfig?.left ?? 1200);
  let top = $derived(disassemblerConfig?.top ?? 50);
  let width = $derived(`${disassemblerConfig?.width ?? 600}px`);
  let height = $derived(`${disassemblerConfig?.height ?? 600}px`);
  let closeable = $derived(disassemblerConfig?.closeable ?? false);
  let resizable = $derived(disassemblerConfig?.resizable ?? true);

  let hoveredLineIndex = $state<number | null>(null);
  let disassembledLines = $state<DisassembledLine[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let scrollToLineIndex = $state<number | undefined>(undefined);
  let showComments = $state(true);
  let currentSyntax = $state<AssemblerSyntax>({ name: 'ACME', commentPrefix: ';', labelSuffix: '', pseudoOpcodePrefix: '!' });

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

  // Re-run disassembly whenever bytes, startAddress, entrypoints, or settings change
  $effect(() => {
    // CRITICAL: Capture reactive dependencies synchronously before async operations
    // Svelte's reactivity can't track dependencies accessed only inside async functions
    const currentFile = $loadedFile;
    const currentEntrypoints = $entrypoints;
    // Trigger re-run on settings changes (settings are read inside disassembler)
    $settings.labelPrefix;
    $settings.assemblerSyntax;

    async function loadDisassembly() {
      if (!currentFile) {
        disassembledLines = [];
        return;
      }

      try {
        isLoading = true;
        error = null;
        scrollToLineIndex = undefined; // Reset scroll position
        hoveredLineIndex = null; // Clear hover state

        // Load syntax definitions
        await loadSyntax();

        // Update current syntax for display
        currentSyntax = getCurrentSyntax();

        const lines = await disassembleWithEntrypoints(
          currentFile.bytes,
          currentFile.startAddress,
          currentEntrypoints
        );
        disassembledLines = lines;

        // Update assembly output for export
        try {
          const asmText = await formatAsAssembly(lines, currentFile.startAddress, showComments, currentFile.name);
          assemblyOutput.set(asmText);
        } catch (exportError) {
          console.error('Failed to generate assembly output:', exportError);
          // Don't block disassembly if export fails
        }
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
        disassembledLines = [];
      } finally {
        isLoading = false;
      }
    }

    loadDisassembly();
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

{#if disassemblerConfig}
<Window
  title="Disassembler"
  {left}
  {top}
  {width}
  {height}
  {closeable}
  {resizable}
  windowKey="window_disassembler"
>
  {#if $loadedFile}
    <div class="disassembler-content">
      <div class="code-viewer-container">
        <div class="code-viewer">
          {#if isLoading}
            <div class="loading">Analyzing with entrypoints...</div>
          {:else if error}
            <div class="loading">Error: {error}</div>
          {:else}
            <div class="controls-row">
              <JumpToAddress onjump={handleJump} />
              <label class="toggle-comments">
                <input type="checkbox" bind:checked={showComments} />
                Show Comments
              </label>
            </div>

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
                  class="code-line-wrapper"
                  class:highlighted={hoveredLineIndex === idx}
                  class:is-data={line.isData}
                  onmouseenter={() => hoveredLineIndex = idx}
                  onmouseleave={() => hoveredLineIndex = null}
                >
                  {#if line.label}
                    <div class="code-label-line">
                      <span class="code-label">{line.label}{currentSyntax.labelSuffix}</span>
                    </div>
                  {/if}
                  <div class="code-line">
                    <span class="code-addr">{toHex(line.address, 4)}</span>
                    {#if !line.isData}
                      <span
                        class="code-bytes"
                        data-tooltip={getTooltipText(line)}
                      >
                        {formatBytes(line.bytes)}
                      </span>
                    {:else}
                      <span class="code-bytes code-bytes-empty"></span>
                    {/if}
                    <span class="code-instruction">
                      {line.instruction}
                      {#if showComments && line.comment}
                        <span class="code-comment">{currentSyntax.commentPrefix} {line.comment}</span>
                      {/if}
                    </span>
                  </div>
                </div>
              {/snippet}
            </VirtualScroller>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="disassembler-content" style="padding: 20px;">
      <h2>No file loaded</h2>
      <p>Use File > Load PRG to load a program file for disassembly.</p>
    </div>
  {/if}
</Window>
{/if}

<style>
  .disassembler-content {
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  h2 {
    color: #00c698;
    margin: 0 0 8px 0;
    font-size: 16px;
  }

  .code-viewer-container {
    flex: 1;
    overflow: hidden;
  }

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

  .controls-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
    flex-shrink: 0;
  }

  .toggle-comments {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
  }

  .toggle-comments input[type="checkbox"] {
    cursor: pointer;
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

  .code-line-wrapper {
    contain: layout style;
    border-left: 3px solid transparent;
    padding-left: 8px;
  }

  .code-line-wrapper.is-data {
    border-left-color: rgba(255, 170, 0, 0.4);
    background: rgba(255, 170, 0, 0.03);
  }

  .code-line-wrapper:hover {
    background: rgba(0, 198, 152, 0.1);
  }

  .code-line-wrapper.highlighted {
    background: rgba(0, 198, 152, 0.1);
  }

  .code-label-line {
    padding: 4px 0 2px 0;
    margin-top: 8px;
    border-top: 1px solid rgba(0, 198, 152, 0.15);
  }

  .code-line {
    line-height: 160%;
    display: flex;
    gap: 16px;
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

  .code-bytes-empty {
    cursor: default;
  }

  .code-bytes:hover {
    color: #aaaaaa;
  }

  .code-bytes-empty:hover {
    color: #888888;
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

  .code-comment {
    color: #888888;
    margin-left: 12px;
    font-style: italic;
  }

  .code-label {
    color: #ffaa00;
    font-weight: bold;
    margin-right: 8px;
  }

  .loading {
    color: #888888;
    font-style: italic;
  }

  p {
    margin: 8px;
    line-height: 160%;
  }
</style>
