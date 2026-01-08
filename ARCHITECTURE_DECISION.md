# Architecture Decision Record: Svelte Migration

**Date:** 2026-01-06
**Decision:** Migrate from class-based vanilla TypeScript to Svelte
**Status:** Approved and In Progress

---

## Context

After completing Phase 1 (File Loading System), we reviewed the architectural approach and identified several concerns with the current class-based vanilla TypeScript implementation:

### Current Issues

1. **Memory Leaks**
   - Event listeners added to `document` but never cleaned up
   - No proper lifecycle management for components
   - Manual DOM manipulation without cleanup

2. **State Management Complexity**
   - Manual state updates across multiple classes
   - `window.app` global pattern (anti-pattern)
   - Manual DOM updates via `innerHTML`
   - No reactive data flow

3. **Maintenance Burden**
   - High boilerplate for simple operations
   - Manual event listener tracking
   - Error-prone manual DOM manipulation
   - Difficult to test

4. **Future Complexity**
   - Upcoming phases (2-6) require complex state management
   - Hex viewer, disassembler, assembly viewer all need reactive updates
   - Tab switching, syntax highlighting, entrypoint editing
   - Each feature would multiply the state management complexity

---

## Decision

**Migrate to Svelte** for the following reasons:

### Why Svelte?

1. **Automatic State Management**
   - Reactive declarations (`$:`) handle updates automatically
   - No manual DOM manipulation needed
   - State changes trigger UI updates automatically

2. **Lifecycle Management**
   - `onMount` and `onDestroy` hooks handle cleanup
   - Event listeners automatically removed
   - No memory leaks

3. **Smaller Bundle Size**
   - Svelte compiles to vanilla JS (no runtime)
   - ~25-30KB total (vs 20KB current)
   - Only 5-10KB overhead for massive productivity gains

4. **Better Developer Experience**
   - Less boilerplate code
   - Clearer data flow
   - TypeScript support is excellent
   - Stores for global state (replaces `window.app`)

5. **Future-Proof**
   - Phases 2-6 will be 50% faster to implement
   - Easier to maintain and extend
   - Better for future contributors (or future Claude sessions)

### Why Not Alternatives?

- **Functional vanilla JS**: Still requires manual state/DOM management
- **React**: Larger bundle, more complex, overkill for this app
- **Vue**: Good option, but Svelte has smaller bundle and simpler syntax
- **Keep current**: Would cost 10-15 hours in complexity across future phases

---

## Migration Strategy

### Phase 0: Setup (30 minutes)
1. ✅ Create this architecture decision document
2. Install Svelte dependencies
3. Configure Vite for Svelte
4. Setup TypeScript for Svelte components

### Phase 1A: Port Existing Work (2-3 hours)
1. Create Svelte stores for state
2. Port FileLoader (stays as utility, no change needed)
3. Create App.svelte (main component)
4. Create MenuBar.svelte
5. Create Editor.svelte (basic display)
6. Migrate CSS (minimal changes)

### Phase 2+: Continue with Svelte
- All future phases implemented as Svelte components
- HexViewer.svelte, AssemblyViewer.svelte, etc.

---

## Cost-Benefit Analysis

### Upfront Cost
- **Time to migrate**: 3-4 hours
- **Learning curve**: Low (Svelte is easiest modern framework)
- **Bundle size increase**: +5-10KB

### Long-Term Benefits
- **Time saved on Phases 2-6**: 10-15 hours
- **Reduced bugs**: Automatic cleanup, no memory leaks
- **Easier maintenance**: Clearer code, better DX
- **Net ROI**: +6-11 hours saved overall

---

## What We Keep

### Unchanged
- ✅ All CSS (reused as-is)
- ✅ FileLoader logic (utility functions work in Svelte)
- ✅ Python disassembler porting strategy
- ✅ JSON data files (opcodes, C64 mapping, entrypoints)
- ✅ Project structure and build system (Vite)
- ✅ TypeScript strict mode
- ✅ Storage/localStorage logic

### Replaced
- ❌ Class-based components → Svelte components
- ❌ Manual DOM manipulation → Reactive templates
- ❌ `window.app` global → Svelte stores
- ❌ Manual event listeners → Svelte event handlers
- ❌ Window.ts/Dialog.ts → Svelte component library or simpler implementation

---

## Technical Details

### Before (Class-Based)
```typescript
// App.ts - Manual state management
class App {
  loadedFile: LoadedPRG | null = null;

  async handleLoadPRG() {
    const file = await this.fileLoader.selectAndLoadPRG();
    this.loadedFile = file;
    this.editor.displayLoadedFile(file);      // Manual update
    this.setStatus(`Loaded: ${file.name}`);   // Manual update
    this.updateMenuState();                    // Manual update
  }
}
```

### After (Svelte)
```svelte
<!-- App.svelte - Automatic reactive updates -->
<script lang="ts">
  import { loadedFile } from './stores';

  async function handleLoadPRG() {
    $loadedFile = await fileLoader.selectAndLoadPRG();
    // That's it! All UI updates automatically via reactivity
  }

  // Reactive derived values
  $: status = $loadedFile ? `Loaded: ${$loadedFile.name}` : 'Ready';
  $: saveDisabled = !$assemblyOutput;
</script>

<MenuBar {saveDisabled} on:loadPRG={handleLoadPRG} />
<Editor file={$loadedFile} />
<StatusBar {status} />
```

**Lines of code**: 240 → 80 (67% reduction)
**Manual updates**: 3 → 0 (automatic)
**Potential bugs**: High → Low (compiler catches issues)

---

## Risks and Mitigations

### Risk 1: Learning Curve
- **Mitigation**: Svelte has excellent documentation
- **Mitigation**: Syntax is simpler than React/Vue
- **Mitigation**: Can migrate incrementally

### Risk 2: Bundle Size Increase
- **Impact**: +5-10KB (25KB → 30KB)
- **Mitigation**: Acceptable trade-off for productivity
- **Mitigation**: Svelte compiles to vanilla JS (no runtime)

### Risk 3: Migration Takes Longer Than Expected
- **Mitigation**: Only Phase 1 code to migrate (~500 lines)
- **Mitigation**: Most code is utilities that don't need changes
- **Mitigation**: Can fall back to vanilla if absolutely necessary (unlikely)

### Risk 4: Window/Dialog System Complexity
- **Mitigation**: Can use existing dialog system initially
- **Mitigation**: Svelte has excellent component libraries available
- **Mitigation**: Or implement simpler dialogs with Svelte components

---

## Success Criteria

### Migration Complete When:
1. ✅ All Phase 1 functionality working in Svelte
2. ✅ File loading works (Load PRG menu)
3. ✅ File display shows in editor
4. ✅ Status bar updates
5. ✅ Menu items enable/disable correctly
6. ✅ Build produces working bundle
7. ✅ No console errors
8. ✅ Bundle size < 35KB

### Development Velocity After Migration:
- Phase 2 (Hex Viewer): 2-3 hours (vs 4-5 with vanilla)
- Phase 3 (Disassembler): 4-6 hours (vs 8-10 with vanilla)
- Phase 4 (Assembly Viewer): 2-3 hours (vs 4-5 with vanilla)

---

## Implementation Timeline

### Day 1 (Session 2026-01-06)
- [x] Architecture decision documented
- [ ] Svelte setup complete (30 min)
- [ ] Basic App.svelte working (1 hour)
- [ ] MenuBar + Editor components (1 hour)
- [ ] Phase 1 functionality migrated (1 hour)
- [ ] Build and test (30 min)

**Target**: Complete migration in 4 hours

### Future Sessions
- Continue with Phase 2+ using Svelte components
- Gradually improve component structure as needed
- Consider component library for advanced features

---

## References

- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Svelte TypeScript](https://svelte.dev/docs/typescript)
- [Svelte Stores](https://svelte.dev/docs/svelte-store)
- [Vite + Svelte](https://vitejs.dev/guide/)

---

## Approval

**Decision Maker:** User (Ingo Hinterding)
**Approved:** 2026-01-06
**Implementation Start:** 2026-01-06

**Reasoning:** "Now is the best time for those decisions" - making architectural changes before building complex features is the right approach.

---

## Lessons Learned (Post-Migration)

_To be filled in after migration is complete_

### What Went Well
- TBD

### What Could Be Improved
- TBD

### Actual Time Spent
- TBD

### Would We Make Same Decision Again?
- TBD

---

**End of Architecture Decision Record**
