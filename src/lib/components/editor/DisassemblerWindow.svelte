<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { loadedFile, config, assemblyOutput } from '$lib/stores/app';
  import { entrypoints } from '$lib/stores/entrypoints';
  import { customLabels, isValidLabelName, LABEL_NAME_ERROR } from '$lib/stores/labels';
  import { customComments } from '$lib/stores/comments';
  import { settings } from '$lib/stores/settings';
  import type { AssemblerSyntax } from '$lib/types';
  import { disassembleWithEntrypoints, type DisassembledLine } from '$lib/services/enhancedDisassembler';
  import { formatAsAssembly } from '$lib/services/assemblyExporter';
  import { loadSyntax, getSyntax } from '$lib/services/syntaxService';
  import VirtualScroller from '$lib/components/ui/VirtualScroller.svelte';
  import JumpToAddress from '$lib/components/ui/JumpToAddress.svelte';
  import { toHex } from '$lib/utils/format';
  import { loadSyntaxColors, highlightInstruction, highlightDataLine, type SyntaxColors } from '$lib/services/syntaxHighlight';

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
  let currentSyntax = $state<AssemblerSyntax>({ id: '', name: '', commentPrefix: ';', labelSuffix: '', pseudoOpcodePrefix: '!' });
  let editingLabelAddress = $state<number | null>(null);
  let editingLabelValue = $state('');
  let editingCommentAddress = $state<number | null>(null);
  let editingCommentValue = $state('');
  let syntaxColors = $state<SyntaxColors | null>(null);

  // Line height in pixels - measured from actual rendered content
  const LINE_HEIGHT = 21;

  function formatBytes(bytes: number[]): string {
    return bytes.map(b => toHex(b, 2)).join(' ');
  }

  function handleLabelClick(address: number, currentLabel: string) {
    // Remove label prefix to get just the custom name (or hex address)
    const prefix = $settings.labelPrefix;
    let currentName = currentLabel;
    if (currentLabel.startsWith(prefix)) {
      currentName = currentLabel.substring(prefix.length);
    }

    editingLabelAddress = address;
    editingLabelValue = currentName;
  }

  function handleLabelSave(address: number) {
    // Prevent double-save (from both Enter key and blur)
    if (editingLabelAddress !== address) return;

    const trimmed = editingLabelValue.trim();

    if (!trimmed) {
      // If empty, cancel editing
      editingLabelAddress = null;
      editingLabelValue = '';
      return;
    }

    // Validate label name
    if (!isValidLabelName(trimmed)) {
      alert(LABEL_NAME_ERROR);
      // Cancel editing on invalid input so user can exit
      editingLabelAddress = null;
      editingLabelValue = '';
      return;
    }

    customLabels.setLabel(address, trimmed);
    editingLabelAddress = null;
    editingLabelValue = '';
  }

  function handleLabelCancel() {
    editingLabelAddress = null;
    editingLabelValue = '';
  }

  function handleLabelKeydown(event: KeyboardEvent, address: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLabelSave(address);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleLabelCancel();
    }
  }

  function handleCommentClick(address: number, currentComment: string | undefined) {
    editingCommentAddress = address;
    editingCommentValue = currentComment || '';
  }

  function handleCommentSave(address: number) {
    // Prevent double-save (blur fires after Enter clears editingCommentAddress)
    if (editingCommentAddress !== address) return;

    const trimmed = editingCommentValue.trim();
    customComments.setComment(address, trimmed);

    // Clear editing state immediately - the store update will trigger re-disassembly
    editingCommentAddress = null;
    editingCommentValue = '';
  }

  function handleCommentCancel() {
    editingCommentAddress = null;
    editingCommentValue = '';
  }

  function handleCommentKeydown(event: KeyboardEvent, address: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCommentSave(address);
    } else if (event.key === 'Escape') {
      handleCommentCancel();
    }
  }

  // Track previous file/entrypoints to detect structural changes
  let prevFileId: string | null = null;
  let prevEntrypointsJson: string | null = null;

  // Re-run disassembly whenever bytes, startAddress, entrypoints, or settings change
  $effect(() => {
    // CRITICAL: Capture reactive dependencies synchronously before async operations
    // Svelte's reactivity can't track dependencies accessed only inside async functions
    const currentFile = $loadedFile;
    const currentEntrypoints = $entrypoints;
    const currentCustomLabels = $customLabels;
    const currentCustomComments = $customComments;
    // Trigger re-run on settings changes (settings are read inside disassembler)
    $settings.labelPrefix;
    $settings.assemblerSyntax;
    $settings.customSyntax;

    // Detect if this is a structural change (file or entrypoints) vs cosmetic (labels/comments/settings)
    const currentFileId = currentFile ? `${currentFile.name}-${currentFile.startAddress}` : null;
    const currentEntrypointsJson = JSON.stringify(currentEntrypoints);
    const isStructuralChange = currentFileId !== prevFileId || currentEntrypointsJson !== prevEntrypointsJson;
    prevFileId = currentFileId;
    prevEntrypointsJson = currentEntrypointsJson;

    async function loadDisassembly() {
      if (!currentFile) {
        disassembledLines = [];
        return;
      }

      try {
        // Only show loading indicator for structural changes to avoid unmounting VirtualScroller
        if (isStructuralChange) {
          isLoading = true;
          scrollToLineIndex = undefined;
        }
        error = null;

        // Load syntax definitions and colors
        await loadSyntax();
        syntaxColors = await loadSyntaxColors();

        // Update current syntax for display
        currentSyntax = getSyntax();

        const lines = await disassembleWithEntrypoints(
          currentFile.bytes,
          currentFile.startAddress,
          currentEntrypoints,
          currentCustomLabels,
          currentCustomComments
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
                      {#if editingLabelAddress === line.address}
                        <input
                          type="text"
                          class="label-edit-input"
                          bind:value={editingLabelValue}
                          onblur={() => handleLabelSave(line.address)}
                          onkeydown={(e) => handleLabelKeydown(e, line.address)}
                          autofocus
                        />
                        <span class="code-label-suffix">{currentSyntax.labelSuffix}</span>
                      {:else}
                        <span
                          class="code-label"
                          onclick={() => handleLabelClick(line.address, line.label!)}
                          title="Click to rename label"
                        >{line.label}{currentSyntax.labelSuffix}</span>
                      {/if}
                      {#if showComments && line.xrefComment}
                        <span class="code-xref">{currentSyntax.commentPrefix} {line.xrefComment}</span>
                      {/if}
                    </div>
                  {/if}
                  <div class="code-line">
                    <span class="code-addr">{toHex(line.address, 4)}</span>
                    {#if !line.isData}
                      <span class="code-bytes">{formatBytes(line.bytes)}</span>
                    {:else}
                      <span class="code-bytes code-bytes-empty"></span>
                    {/if}
                    <span class="code-instruction-wrapper">
                      <span class="code-instruction">
                        {#if syntaxColors}
                          {@const tokens = line.isData
                            ? highlightDataLine(line.instruction, syntaxColors)
                            : highlightInstruction(line.instruction, syntaxColors)}
                          {#each tokens as token}
                            <span style="color: {token.color}">{token.text}</span>
                          {/each}
                        {:else}
                          {line.instruction}
                        {/if}
                      </span>
                      {#if showComments}
                        {#if editingCommentAddress === line.address}
                          <input
                            type="text"
                            class="comment-edit-input"
                            bind:value={editingCommentValue}
                            onblur={() => handleCommentSave(line.address)}
                            onkeydown={(e) => handleCommentKeydown(e, line.address)}
                            placeholder="Add comment..."
                            autofocus
                          />
                        {:else if line.comment}
                          <span
                            class="code-comment"
                            onclick={() => handleCommentClick(line.address, line.comment)}
                            title="Click to edit comment"
                          >{currentSyntax.commentPrefix} {line.comment}</span>
                        {:else}
                          <!-- Clickable area that extends to end of line for adding comments -->
                          <span
                            class="code-comment-area"
                            onclick={() => handleCommentClick(line.address, undefined)}
                            title="Click to add comment"
                          >&nbsp;</span>
                        {/if}
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
  }

  .code-bytes-empty {
    cursor: default;
  }

  .code-instruction-wrapper {
    color: #ffffff;
    flex: 1;
    font-family: 'Courier New', Courier, monospace;
    display: flex;
    align-items: center;
  }

  .code-instruction {
    color: #ffffff;
    font-family: 'Courier New', Courier, monospace;
  }

  .code-comment {
    color: #888888;
    margin-left: 12px;
    font-style: italic;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .code-comment:hover {
    color: #aaa;
  }

  .code-comment-area {
    margin-left: 12px;
    flex: 1;
    cursor: text;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .code-comment-area:hover {
    opacity: 1;
    background: rgba(136, 136, 136, 0.1);
  }

  .comment-edit-input {
    background: #1a1a1a;
    border: 2px solid #888;
    color: #fff;
    padding: 2px 6px;
    margin-left: 8px;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    font-style: italic;
    outline: none;
    min-width: 200px;
  }

  .comment-edit-input:focus {
    border-color: #aaa;
    background: #222;
  }

  .code-label {
    color: #ffaa00;
    font-weight: bold;
    margin-right: 8px;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .code-label:hover {
    color: #ffcc44;
    text-decoration: underline;
  }

  .code-label-suffix {
    color: #ffaa00;
    font-weight: bold;
    margin-left: 2px;
  }

  .code-xref {
    color: #888888;
    font-style: italic;
    margin-left: 16px;
  }

  .label-edit-input {
    background: #1a1a1a;
    border: 2px solid #ffaa00;
    color: #ffaa00;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    font-weight: bold;
    outline: none;
    min-width: 100px;
  }

  .label-edit-input:focus {
    border-color: #ffcc44;
    background: #222222;
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
