<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from '$lib/components/ui/MenuBar.svelte';
  import EditorWindow from '$lib/components/editor/EditorWindow.svelte';
  import CodeViewWindow from '$lib/components/editor/CodeViewWindow.svelte';
  import InfoWindow from '$lib/components/editor/InfoWindow.svelte';
  import EntrypointsWindow from '$lib/components/editor/EntrypointsWindow.svelte';
  import DisassemblerWindow from '$lib/components/editor/DisassemblerWindow.svelte';
  import StatusBar from '$lib/components/ui/StatusBar.svelte';
  import About from '$lib/components/dialogs/About.svelte';
  import Storage from '$lib/services/storage';
  import FileLoader from '$lib/services/fileLoader';
  import { loadedFile, assemblyOutput, config, status, setStorageInstance, setFileLoaderInstance } from '$lib/stores/app';
  import { entrypoints } from '$lib/stores/entrypoints';
  import { get_config } from '$lib/config';

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

    // Register storage instance for auto-save
    setStorageInstance(storage);

    // Register fileLoader instance for drag and drop
    setFileLoaderInstance(fileLoader);

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

      // Clear old entrypoints and add start address as code entrypoint
      entrypoints.clear();
      entrypoints.add(file.startAddress, 'code');
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
        entrypoints.clear();
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
    {#if $loadedFile && $config?.window_editor?.isOpen}
      <EditorWindow />
    {/if}
    {#if $loadedFile && $config?.window_codeview?.isOpen}
      <CodeViewWindow />
    {/if}
    {#if $config?.window_info?.isOpen}
      <InfoWindow />
    {/if}
    {#if $loadedFile && $config?.window_entrypoints?.isOpen}
      <EntrypointsWindow />
    {/if}
    {#if $loadedFile && $config?.window_disassembler?.isOpen}
      <DisassemblerWindow />
    {/if}
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
