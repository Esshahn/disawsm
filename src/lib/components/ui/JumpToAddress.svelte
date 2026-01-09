<script lang="ts">
  let {
    onjump
  }: {
    onjump?: (address: number) => void;
  } = $props();

  let inputValue = $state('');
  let error = $state('');

  function handleJump() {
    error = '';

    // Remove common prefixes and whitespace
    let cleanValue = inputValue.trim().toLowerCase();
    cleanValue = cleanValue.replace(/^(0x|\$)/, '');

    // Validate hex input
    if (!/^[0-9a-f]+$/.test(cleanValue)) {
      error = 'Invalid hex address';
      return;
    }

    // Convert to number
    const address = parseInt(cleanValue, 16);

    if (isNaN(address)) {
      error = 'Invalid address';
      return;
    }

    // Call the jump handler
    if (onjump) {
      onjump(address);
    }

    // Clear input on successful jump
    inputValue = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleJump();
    }
  }
</script>

<div class="jump-to-address">
  <input
    type="text"
    bind:value={inputValue}
    onkeydown={handleKeydown}
    placeholder="Jump to (e.g. c000)"
    class="jump-input"
    class:error={error}
  />
  <button onclick={handleJump} class="jump-button">Go</button>
  {#if error}
    <span class="error-message">{error}</span>
  {/if}
</div>

<style>
  .jump-to-address {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid #333;
    position: relative;
  }

  .jump-input {
    flex: 1;
    min-width: 120px;
    max-width: 200px;
    padding: 6px 10px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }

  .jump-input:focus {
    border-color: #00c698;
  }

  .jump-input.error {
    border-color: #ff4444;
  }

  .jump-input::placeholder {
    color: #666;
  }

  .jump-button {
    padding: 6px 16px;
    background: #00c698;
    border: none;
    border-radius: 4px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .jump-button:hover {
    background: #00d4a3;
  }

  .jump-button:active {
    background: #00a87f;
  }

  .error-message {
    position: absolute;
    left: 12px;
    bottom: -20px;
    color: #ff4444;
    font-size: 11px;
    font-family: 'Quicksand', sans-serif;
  }
</style>
