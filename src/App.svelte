<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from '$lib/components/ui/MenuBar.svelte';
  import MonitorWindow from '$lib/components/editor/MonitorWindow.svelte';
  import InfoWindow from '$lib/components/editor/InfoWindow.svelte';
  import EntrypointsWindow from '$lib/components/editor/EntrypointsWindow.svelte';
  import DisassemblerWindow from '$lib/components/editor/DisassemblerWindow.svelte';
  import LabelsWindow from '$lib/components/editor/LabelsWindow.svelte';
  import StatusBar from '$lib/components/ui/StatusBar.svelte';
  import About from '$lib/components/dialogs/About.svelte';
  import Settings from '$lib/components/dialogs/Settings.svelte';
  import Storage from '$lib/services/storage';
  import FileLoader from '$lib/services/fileLoader';
  import { loadedFile, assemblyOutput, config, status, setStorageInstance, setFileLoaderInstance, loadPRGFile, updateWindowConfig } from '$lib/stores/app';
  import { entrypoints } from '$lib/stores/entrypoints';
  import { customLabels } from '$lib/stores/labels';
  import { customComments } from '$lib/stores/comments';
  import { get_config } from '$lib/config';
  import { downloadAssembly } from '$lib/services/assemblyExporter';
  import { saveProject, loadProject } from '$lib/services/projectFile';
  import { saveSession, loadSession, clearSession } from '$lib/services/sessionStorage';

  // Initialize immediately (not in onMount)
  let fileLoader = new FileLoader();
  let storage: Storage;
  let showAbout = $state(false);
  let showSettings = $state(false);
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

    // Restore saved session if it exists
    const session = loadSession();
    if (session) {
      loadPRGFile({
        name: session.name,
        startAddress: session.startAddress,
        bytes: session.bytes
      });

      // Restore entrypoints
      entrypoints.clear();
      for (const ep of session.entrypoints) {
        entrypoints.add(ep.address, ep.type);
      }
    }

    // Show about dialog if version updated
    if (storage.is_updated_version()) {
      showAbout = true;
    }
  });

  // Auto-save session whenever loadedFile or entrypoints change
  $effect(() => {
    const file = $loadedFile;
    const eps = $entrypoints;

    if (file) {
      // Auto-save current session to localStorage
      saveSession(file.name, file.startAddress, file.bytes, eps);
    } else {
      // Clear session when no file is loaded
      clearSession();
    }
  });

  async function handleLoadPRG() {
    const file = await fileLoader.selectAndLoadPRG();
    if (file) {
      loadPRGFile(file);
    }
  }

  function handleSaveAssembly() {
    const asm = $assemblyOutput;
    const file = $loadedFile;

    if (!asm || !file) {
      alert('No assembly output to save. Please load and disassemble a file first.');
      return;
    }

    // Generate filename from original PRG name, replacing .prg with .asm
    const filename = file.name.replace(/\.prg$/i, '.asm');

    downloadAssembly(asm, filename);
  }

  async function handleLoadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dis';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const projectData = await loadProject(file);

        // Load the file data
        loadPRGFile({
          name: projectData.name,
          startAddress: projectData.startAddress,
          bytes: projectData.bytes
        });

        // Clear existing entrypoints and load project entrypoints
        entrypoints.clear();
        for (const ep of projectData.entrypoints) {
          entrypoints.add(ep.address, ep.type);
        }

        // Clear existing labels and load project labels
        customLabels.clear();
        for (const label of projectData.labels) {
          customLabels.setLabel(label.address, label.name);
        }

        // Clear existing comments and load project comments
        customComments.clear();
        for (const comment of projectData.comments) {
          customComments.setComment(comment.address, comment.comment);
        }
      } catch (error) {
        alert('Failed to load project: ' + (error as Error).message);
      }
    };

    input.click();
  }

  function handleSaveProject() {
    const file = $loadedFile;
    const eps = $entrypoints;
    const labels = $customLabels;
    const comments = $customComments;

    if (!file) {
      alert('No file loaded. Please load a PRG or project first.');
      return;
    }

    saveProject(file.name, file.startAddress, file.bytes, eps, labels, comments);
  }

  function handleClear() {
    const file = loadedFile;
    if (file) {
      const confirmed = confirm('Clear the current file and all data?');
      if (confirmed) {
        loadedFile.set(null);
        assemblyOutput.set(null);
        entrypoints.clear();
        customLabels.clear();
        customComments.clear();
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

  function handleShowSettings() {
    allowKeyboardShortcuts = false;
    showSettings = true;
  }

  function handleCloseSettings() {
    allowKeyboardShortcuts = true;
    showSettings = false;
  }

  function handleToggleWindow(windowKey: string) {
    const currentState = $config?.[windowKey as keyof typeof $config] as { isOpen?: boolean };
    if (currentState && 'isOpen' in currentState) {
      updateWindowConfig(windowKey, { isOpen: !currentState.isOpen });
    }
  }
</script>

<div id="container">
  <MenuBar
    onloadPRG={handleLoadPRG}
    onloadProject={handleLoadProject}
    onsaveAssembly={handleSaveAssembly}
    onsaveProject={handleSaveProject}
    onclear={handleClear}
    onshowAbout={handleShowAbout}
    onshowSettings={handleShowSettings}
    ontoggleWindow={handleToggleWindow}
  />

  <div id="app">
    {#if $loadedFile && $config?.window_monitor?.isOpen}
      <MonitorWindow />
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
    {#if $loadedFile && $config?.window_labels?.isOpen}
      <LabelsWindow />
    {/if}
  </div>

  <StatusBar message={$status} />

  {#if showAbout}
    <About onclose={handleCloseAbout} />
  {/if}

  {#if showSettings}
    <Settings onclose={handleCloseSettings} />
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
