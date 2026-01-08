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

<!-- Simple modal overlay -->
<div class="modal-overlay" onclick={handleClose}>
  <div class="about-dialog" onclick={(e: MouseEvent) => e.stopPropagation()}>
    <div class="dialog-header">
      <h2>About DisAWSM</h2>
      <button class="close-button" onclick={handleClose}>×</button>
    </div>

    <div class="dialog-content">
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
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .about-dialog {
    background: #121212 url("/ui/bg_glossy.png") 50% top repeat-x;
    border-radius: 4px;
    border: 1px solid #2a2a2a;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    width: 680px;
    max-width: 90vw;
    color: #ffffff;
    font-family: 'Quicksand', sans-serif;
  }

  .dialog-header {
    border-bottom: 1px solid #141414;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }


  .close-button {
    background: none;
    border: none;
    color: #aaaaaa;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    line-height: 1;
  }

  .close-button:hover {
    color: #ffffff;
  }

  .dialog-content {
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
