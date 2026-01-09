# Adding New Windows to DisAWSM

This guide explains how to add new windows to the application. The process requires updates in exactly 5 files.

## Quick Checklist

- [ ] 1. Add window config in `src/lib/config/index.ts`
- [ ] 2. Add types in `src/lib/types/index.ts`
- [ ] 3. Add storage handling in `src/lib/services/storage.ts`
- [ ] 4. Add window component to `src/App.svelte`
- [ ] 5. Create window component file

## Detailed Steps

### 1. Add Window Config (`src/lib/config/index.ts`)

Add your window configuration object to the config. Look for the comment marker.

```typescript
export function get_config() {
  const config = {
    version: "26.01.09.3",
    default_filename: "mycode",
    // ... existing windows ...
    window_mywindow: {
      top: 50,
      left: 700,
      width: 400,
      height: 500,
      autoOpen: true,
      closeable: false,
      isOpen: true,
      resizable: false
    }
  };
  return config;
}
```

### 2. Add Types (`src/lib/types/index.ts`)

Add two type definitions - look for the comment markers:

**AppConfig interface:**
```typescript
export interface AppConfig {
  version: string;
  default_filename: string;
  // ... existing windows ...
  window_mywindow: WindowConfig;  // ADD THIS
}
```

**UserConfig interface:**
```typescript
export interface UserConfig {
  version: string;
  default_filename?: string;
  // ... existing windows ...
  window_mywindow?: {  // ADD THIS
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    isOpen?: boolean;
  };
}
```

### 3. Add Storage Handling (`src/lib/services/storage.ts`)

Three places to update - look for the comment markers:

**A. In `init()` method (around line 107):**
```typescript
if (this.userConfig!.window_mywindow) {
  const userWindow = this.userConfig!.window_mywindow;
  if (userWindow.left !== undefined) this.config.window_mywindow.left = userWindow.left;
  if (userWindow.top !== undefined) this.config.window_mywindow.top = userWindow.top;
  if (userWindow.width !== undefined) this.config.window_mywindow.width = userWindow.width;
  if (userWindow.height !== undefined) this.config.window_mywindow.height = userWindow.height;
  if (userWindow.isOpen !== undefined) this.config.window_mywindow.isOpen = userWindow.isOpen;
}
```

**B. In `updateUserConfig()` method (around line 186):**
```typescript
if (updates.window_mywindow) {
  this.userConfig.window_mywindow = {
    ...this.userConfig.window_mywindow,
    ...updates.window_mywindow
  };
}
```

**C. In `write()` method (around line 221):**
```typescript
window_mywindow: {
  left: data.window_mywindow.left,
  top: data.window_mywindow.top,
  width: data.window_mywindow.width,
  height: data.window_mywindow.height,
  isOpen: data.window_mywindow.isOpen
}
```

### 4. Add to App.svelte (`src/App.svelte`)

**A. Import the window component:**
```typescript
import MyWindow from '$lib/components/editor/MyWindow.svelte';
```

**B. Add to template:**
```svelte
{#if $config?.window_mywindow?.isOpen}
  <MyWindow />
{/if}
```

### 5. Create Window Component (`src/lib/components/editor/MyWindow.svelte`)

Create a new file using this template:

```svelte
<script lang="ts">
  import Window from '$lib/components/ui/Window.svelte';
  import { appConfig } from '$lib/stores/app';
  import MyView from './MyView.svelte';

  const windowKey = 'window_mywindow';
  let config = $derived($appConfig[windowKey]);
</script>

{#if config.isOpen}
  <Window
    title="My Window"
    left={config.left}
    top={config.top}
    width={config.width}
    height={config.height}
    closeable={config.closeable}
    resizable={config.resizable}
    windowKey={windowKey}
  >
    <MyView />
  </Window>
{/if}
```

Then create your content component (`MyView.svelte`) separately.

## Tips

- All comment markers say "WHEN ADDING A NEW WINDOW" - search for this phrase to find the exact locations
- Window keys must follow the pattern `window_*` (e.g., `window_editor`, `window_info`)
- The `windowKey` prop connects the window to its config for saving position/size
- Keep the view logic separate from the window wrapper for better organization

## Common Mistakes

1. **Forgetting storage.ts**: This has 3 places that need updating
2. **Wrong property names**: Using `window_info` instead of `window_checkpoints` in storage merge blocks
3. **Missing UserConfig**: Forgetting to add the optional interface in UserConfig
4. **Copy-paste errors**: Make sure all references use your new window name consistently

## Verification

After adding a window, verify:
- [ ] Window appears when app loads
- [ ] Window can be dragged and maintains position after refresh
- [ ] Window can be resized (if `resizable: true`)
- [ ] No console errors
- [ ] localStorage saves window position correctly
