<script lang="ts">
  import { saveDisabled, config, loadedFile } from '$lib/stores/app';

  let {
    onloadPRG,
    onloadProject,
    onsaveAssembly,
    onsaveProject,
    onclear,
    onshowAbout,
    onshowSettings,
    ontoggleWindow
  }: {
    onloadPRG?: () => void;
    onloadProject?: () => void;
    onsaveAssembly?: () => void;
    onsaveProject?: () => void;
    onclear?: () => void;
    onshowAbout?: () => void;
    onshowSettings?: () => void;
    ontoggleWindow?: (windowKey: string) => void;
  } = $props();

  // Helper to check if a window is actually visible
  function isWindowVisible(windowKey: string): boolean {
    const windowConfig = $config?.[windowKey as keyof typeof $config] as { isOpen?: boolean };
    if (!windowConfig?.isOpen) return false;

    // These windows require a loaded file to be visible
    const requiresFile = ['window_monitor', 'window_entrypoints', 'window_disassembler'];
    if (requiresFile.includes(windowKey)) {
      return !!$loadedFile;
    }

    return true;
  }
</script>

<div id="menubar">
  <ul>
    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">disawsm</a>
      <div class="dropdown-content">
        <a onclick={onshowAbout}>About</a>
        <a onclick={onshowSettings}>Settings</a>
      </div>
    </li>

    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">File</a>
      <div class="dropdown-content">
        <a onclick={onloadPRG}>
          Load PRG<span class="hotkey">Ctrl+O</span>
        </a>
        <a onclick={onloadProject}>
          Load Project (*.dis)
        </a>
        <hr />
        <a
          onclick={onsaveAssembly}
          class:disabled={$saveDisabled}
        >
          Save Assembly (*.asm)<span class="hotkey">Ctrl+S</span>
        </a>
        <a
          onclick={onsaveProject}
          class:disabled={$saveDisabled}
        >
          Save Project (*.dis)
        </a>
        <hr />
        <a onclick={onclear}>Clear</a>
      </div>
    </li>

    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">View</a>
      <div class="dropdown-content">
        <a onclick={() => ontoggleWindow?.('window_info')}>
          <span class="checkmark">{#if isWindowVisible('window_info')}✓{/if}</span>
          Info
        </a>
        <a onclick={() => ontoggleWindow?.('window_monitor')}>
          <span class="checkmark">{#if isWindowVisible('window_monitor')}✓{/if}</span>
          Monitor
        </a>
        <a onclick={() => ontoggleWindow?.('window_entrypoints')}>
          <span class="checkmark">{#if isWindowVisible('window_entrypoints')}✓{/if}</span>
          Entrypoints
        </a>
        <a onclick={() => ontoggleWindow?.('window_disassembler')}>
          <span class="checkmark">{#if isWindowVisible('window_disassembler')}✓{/if}</span>
          Disassembler
        </a>
        <hr />
        <a id="menubar-fullscreen">
          Toggle Fullscreen<span class="hotkey">Ctrl+F</span>
        </a>
      </div>
    </li>

    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">Help</a>
      <div class="dropdown-content">
        <a href="https://github.com/Esshahn/disawsm" target="_blank">
          README on github<span class="hotkey"></span>
        </a>
        <hr>
        <a href="http://www.spritemate.com" target="_blank">
          spritemate C64 sprite editor<span class="hotkey"></span>
        </a>
        <a href="https://mem64.awsm.de/" target="_blank">
          C64 Memory Map<span class="hotkey"></span>
        </a>
        <a href="http://www.awsm.de" target="_blank">
          www.awsm.de<span class="hotkey"></span>
        </a>
        <a href="https://csdb.dk/scener/?id=27239" target="_blank">
          awsm on csdb.dk<span class="hotkey"></span>
        </a>
      </div>
    </li>
  </ul>
</div>

<style>
  .checkmark {
    display: inline-block;
    width: 20px;
    color: #ffffff;
    font-weight: bold;
    text-align: center;
  }
</style>
