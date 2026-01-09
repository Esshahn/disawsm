<script lang="ts">
  import { saveDisabled } from '$lib/stores/app';

  let {
    onloadPRG,
    onsaveAssembly,
    onclear,
    onshowAbout
  }: {
    onloadPRG?: () => void;
    onsaveAssembly?: () => void;
    onclear?: () => void;
    onshowAbout?: () => void;
  } = $props();
</script>

<div id="menubar">
  <ul>
    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">disawsm</a>
      <div class="dropdown-content">
        <a onclick={onshowAbout}>About</a>
      </div>
    </li>

    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">File</a>
      <div class="dropdown-content">
        <a onclick={onloadPRG}>
          Load PRG...<span class="hotkey">Ctrl+O</span>
        </a>
        <a
          onclick={onsaveAssembly}
          class:disabled={$saveDisabled}
        >
          Save Assembly...<span class="hotkey">Ctrl+S</span>
        </a>
        <hr />
        <a onclick={onclear}>Clear</a>
      </div>
    </li>

    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">View</a>
      <div class="dropdown-content">
        <a id="menubar-fullscreen">
          Toggle Fullscreen<span class="hotkey">Ctrl+F</span>
        </a>
      </div>
    </li>

    <li class="dropdown">
      <a href="javascript:void(0)" class="dropbtn">Help</a>
      <div class="dropdown-content">
        <a href="https://github.com/Esshahn/spritemate" target="_blank">
          README on github<span class="hotkey"></span>
        </a>
        <a href="http://www.awsm.de" target="_blank">
          www.awsm.de<span class="hotkey"></span>
        </a>
      </div>
    </li>
  </ul>
</div>

<style>
  /* Uses existing CSS from stylesheet.css */
  /* No additional styles needed - menubar styles already defined */
</style>
