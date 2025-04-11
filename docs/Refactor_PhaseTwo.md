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