# BoardScene Refactoring: Phase Two

## Remaining Optimizations After React Removal

### Priority Optimizations

1. **Delegate Event Handling to InputManager**
   - Move more event handling logic from BoardScene to InputManager
   - The `handleTileClick` and `handleHabitatClick` methods are still quite large and contain game logic
   - Create a proper EventManager that can coordinate between user input and game actions

3. **Create a ContentManager**
   - Extract `checkTileContents()` into a dedicated ContentManager class
   - This manager would be responsible for querying entity positions and providing access to entities at specific grid locations


### Secondary Optimizations

6. **Command Pattern for Actions**
   - Replace direct method calls with command objects
   - This would make actions more testable and allow for undo/redo functionality
   - Provides better history tracking for game actions

7. **Separate Concerns in Update Method**
   - The update method is mixing concerns
   - Create a dedicated update pipeline with clear responsibilities

8. **Clean Up Getter Methods**
   - Remove unnecessary getter methods at the end of the file
   - Use dependency injection to provide components where needed

9. **Consistent API Patterns**
   - Make store methods and action functions follow consistent parameter patterns
   - Either both use object parameters or both use individual parameters



To simplify the subscription system, I'd recommend these architectural changes:

1. **Use selector-based subscriptions** - Instead of manually comparing previous/current values, adopt a more declarative approach where components just specify what data they need.

2. **Automatic dependency tracking** - Implement a system that automatically tracks which parts of the state each renderer needs, eliminating manual subscription setup.

3. **Centralize subscription logic** - Create a single subscription manager that handles all subscriptions rather than spreading logic across multiple files.

4. **Event-driven updates** - For fine-grained updates, use a simpler event system where state changes emit specific events that renderers can listen for directly.

5. **Memoization pattern** - Replace deep comparisons with memoized selectors that only recalculate when inputs change.

6. **Resource management** - Implement an automatic cleanup system for subscriptions based on component lifecycle.

7. **Reduced granularity** - Instead of highly specific optimizations like individual lushness updates, balance between performance and maintainability with slightly coarser update strategies.

This would significantly reduce boilerplate code while maintaining performance and making the system more maintainable.

---

SPLIT SELECTORS (GET) FROM ACTIONS (SET)

- Extract all of the getX and isX functions (plus the tile‐filter helpers like getTiles…) into selectors.ts, reimplementing them there so they call useGameStore.getState() directly.
- Remove those same functions (and the export * from './selectors' re‑export) from actions.ts.
- Update every file that was doing import … from "../store/actions" to pull selectors from "../store/selectors" instead.