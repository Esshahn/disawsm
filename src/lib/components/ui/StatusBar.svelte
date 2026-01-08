<script lang="ts">
  let {
    message = 'Ready'
  }: {
    message?: string;
  } = $props();
</script>

<div id="statusbar">
  <div id="statustext">{message}</div>
</div>

<style>
  /* Uses existing CSS from stylesheet.css */
  /* No additional styles needed - statusbar styles already defined */
</style>
