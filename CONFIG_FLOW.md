# Configuration System Flow

**Single Source of Truth: `src/lib/config/index.ts`**

## The Flow

### 1. First Visit (No localStorage)
```
config/index.ts → Storage → localStorage → Svelte Store → Components
   (defaults)      (save)     (saved)        (reactive)     (render)
```

**What happens:**
1. `get_config()` returns default configuration
2. Storage saves it to localStorage
3. Config store is initialized with these defaults
4. Components read from store and display

### 2. User Interacts (Drag window, change settings)
```
User Action → updateWindowConfig() → Config Store → localStorage
 (drag)           (function)          (update)       (save)
```

**What happens:**
1. User drags window to new position
2. `updateWindowConfig()` updates the Svelte store
3. Immediately saves to localStorage
4. Components reactively update

### 3. User Revisits (localStorage exists)
```
config/index.ts + localStorage → Storage → Svelte Store → Components
   (defaults)      (saved user)   (merge)    (reactive)     (render)
```

**What happens:**
1. `get_config()` returns default configuration
2. Storage reads localStorage
3. Storage merges defaults + saved user settings
4. Config store is initialized with merged config
5. Components render with user's saved positions

## Files Involved

### 1. `src/lib/config/index.ts` - **SINGLE SOURCE OF TRUTH**
```typescript
export function get_config() {
  const config = {
    version: "26.01.08",
    window_editor: {
      top: 50,         // ← Edit these defaults
      left: 210,
      width: 700,
      height: 400,
      autoOpen: true,
      closeable: false,
      isOpen: true,
    },
  };
  return config;
}
```

### 2. `src/lib/services/storage.ts` - Handles localStorage
- `init()` - Merges defaults with localStorage
- `write()` - Saves to localStorage
- `read()` - Reads from localStorage

### 3. `src/lib/stores/app.ts` - Reactive Svelte store
```typescript
import { get_config } from '$lib/config';

// Initialize immediately with defaults so components don't break
// This will be updated in App.svelte after merging with localStorage
export const config = writable<AppConfig>(get_config());

export function updateWindowConfig(windowKey, updates) {
  // Updates store + saves to localStorage
}
```

### 4. `src/App.svelte` - Initialization
```typescript
onMount(() => {
  const defaultConfig = get_config();        // Get defaults
  storage = new Storage(defaultConfig);      // Merge with localStorage
  const savedConfig = storage.get_config();  // Get merged config
  config.set(savedConfig);                   // Initialize store
  setStorageInstance(storage);               // Enable auto-save
});
```

### 5. `src/lib/components/ui/Window.svelte` - Auto-save on drag
```typescript
function handleMouseUp() {
  if (isDragging && windowKey) {
    updateWindowConfig(windowKey, {
      left: currentLeft,
      top: currentTop
    });
  }
}
```

## How to Change Defaults

**Edit only ONE file:** `src/lib/config/index.ts`

```typescript
window_editor: {
  top: 100,        // Change Y position
  left: 300,       // Change X position
  width: 800,      // Change width
  height: 500,     // Change height
  autoOpen: true,
  closeable: false,
  isOpen: true,
}
```

## Clear User Settings

To reset to defaults, clear localStorage:
```javascript
localStorage.removeItem('disawsm_config');
```

Then refresh the page.
