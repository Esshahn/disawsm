<script lang="ts">
  import { config } from '$lib/stores/app';

  let {
    onclose
  }: {
    onclose?: () => void;
  } = $props();

  function handleClose() {
    onclose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal overlay using unified styles -->
<div class="modal-overlay" onclick={handleClose}>
  <div class="dialog-wrapper about-dialog" onclick={(e: MouseEvent) => e.stopPropagation()}>
    <div class="dialog-titlebar" style="cursor: default;">
      <span class="dialog-title">About DisAWSM</span>
      <button class="window-close-button" onclick={handleClose}>×</button>
    </div>

    <div class="dialog-content about-content">
      <div class="logo">
        <img src="/ui/logo.svg" alt="DisAWSM Logo" />
      </div>

      <p>A browser-based 6502 disassembler</p>
      <p class="version">Version {$config.version}</p>

      <hr />

      <p>
        <strong>Author:</strong> Ingo Hinterding<br />
        <strong>Website:</strong> <a href="http://www.awsm.de" target="_blank">www.awsm.de</a>
      </p>

      <button class="primary-button" onclick={handleClose}>Close</button>
    </div>
  </div>
</div>

<style>
  /* Component-specific styles - base .modal-overlay, .dialog-wrapper,
     .dialog-titlebar, .dialog-title, and .window-close-button are in stylesheet.css */

  .about-dialog {
    position: static;
    width: 680px;
    max-width: 90vw;
  }

  .about-content {
    padding: 24px;
    text-align: center;
  }

  .logo {
    margin-bottom: 20px;
  }

  .logo img {
    max-width: 200px;
    height: auto;
  }

  .version {
    color: #aaaaaa;
    font-size: 14px;
    margin: 0 0 16px 0;
  }

  p {
    margin: 8px 0;
    line-height: 160%;
  }

  hr {
    border: none;
    border-top: 1px solid #333;
    margin: 20px 0;
  }

  a {
    color: #00c698;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .primary-button {
    font-family: 'Quicksand', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: 2px solid #00c698;
    padding: 8px 16px;
    border-radius: 4px;
    background-color: #00c698;
    color: #ffffff;
    margin-top: 20px;
  }

  .primary-button:hover {
    background-color: #03a27d;
    border-color: #03a27d;
  }
</style>
