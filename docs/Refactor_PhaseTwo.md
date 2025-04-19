# BoardScene Refactoring: Phase Two

## Remaining Optimizations After React Removal

### Priority Optimizations

1. **Delegate Event Handling to InputManager**
   - Move more event handling logic from BoardScene to InputManager
   - The `handleTileClick` and `handleHabitatClick` methods are still quite large and contain game logic
   - Create a proper EventManager that can coordinate between user input and game actions

2. **Implement GameController**
   - Create the GameController outlined in the documentation
   - Move game logic out of BoardScene and into proper controller
   - Establish clear responsibility boundaries between rendering and game logic

3. **Create a ContentManager**
   - Extract `checkTileContents()` into a dedicated ContentManager class
   - This manager would be responsible for querying entity positions and providing access to entities at specific grid locations

4. **Extract Movement Logic**
   - Create a MovementManager that handles unit movement
   - Move `startUnitMovement` and related code there
   - This would centralize all movement logic in one place

5. **Use Proper TypeScript Interfaces**
   - Replace 'any' types with proper interfaces
   - Consider using generics for more flexible code
   - Improve type safety throughout the codebase

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
