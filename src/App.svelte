<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './components/MenuBar.svelte';
  import EditorWindow from './components/EditorWindow.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import About from './components/About.svelte';
  import Storage from './js/Storage';
  import FileLoader from './js/FileLoader';
  import { loadedFile, assemblyOutput, config, status } from './stores';
  import { get_config } from './js/config';

  // Initialize immediately (not in onMount)
  let fileLoader = new FileLoader();
  let storage: Storage;
  let showAbout = $state(false);
  let allowKeyboardShortcuts = $state(true);

  onMount(() => {
    // Initialize storage
    const defaultConfig = get_config();
    storage = new Storage(defaultConfig);
    const savedConfig = storage.get_config();
    config.set(savedConfig);

    // Show about dialog if version updated
    if (storage.is_updated_version()) {
      showAbout = true;
    }
  });

  async function handleLoadPRG() {
    const file = await fileLoader.selectAndLoadPRG();
    if (file) {
      loadedFile.set(file);
      assemblyOutput.set(null); // Clear previous assembly
    }
  }

  function handleSaveAssembly() {
    const asm = assemblyOutput;
    if (!asm) {
      alert('No assembly output to save. Please disassemble a file first.');
      return;
    }
    // TODO: Implement file saving in Phase 5
    alert('Save assembly feature coming in Phase 5');
  }

  function handleClear() {
    const file = loadedFile;
    if (file) {
      const confirmed = confirm('Clear the current file and all data?');
      if (confirmed) {
        loadedFile.set(null);
        assemblyOutput.set(null);
      }
    }
  }

  function handleShowAbout() {
    allowKeyboardShortcuts = false;
    showAbout = true;
  }

  function handleCloseAbout() {
    allowKeyboardShortcuts = true;
    showAbout = false;
  }
</script>

<div id="container">
  <MenuBar
    onloadPRG={handleLoadPRG}
    onsaveAssembly={handleSaveAssembly}
    onclear={handleClear}
    onshowAbout={handleShowAbout}
  />

  <div id="app">
    <EditorWindow />
  </div>

  <StatusBar message={$status} />

  {#if showAbout}
    <About onclose={handleCloseAbout} />
  {/if}

  <div id="custom-tooltip"></div>
</div>

<style>
  /* Container uses existing CSS from stylesheet.css */
  #container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  #app {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
</style>
