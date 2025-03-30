# BoardScene Refactoring: Phase Two

## Recommended Optimizations

1. **Delegate Event Handling to InputManager**
   - Move more event handling logic from BoardScene to InputManager
   - The `handleTileClick` and `handleHabitatClick` methods are still quite large and contain game logic
   - Create a proper EventManager that can coordinate between user input and game actions

2. **Create a ContentManager**
   - Extract `checkTileContents()` into a dedicated ContentManager class
   - This manager would be responsible for querying entity positions and providing access to entities at specific grid locations

3. **Extract Selection Logic**
   - Create a SelectionManager that handles all selection-related functionality
   - Move `handleUnitSelection` and selection-related code there
   - Coordinate with UIScene through events rather than direct actions

4. **Extract Movement Logic**
   - Create a MovementManager that handles unit movement
   - Move `startUnitMovement` and related code there
   - This would centralize all movement logic in one place

5. **Consolidate Initialization**
   - The initialization code is spread across multiple methods (`init`, `create`, `setupCamera`, etc.)
   - Create a more structured initialization pipeline with clear ownership

7. **Reduce Direct Store Access**
   - BoardScene still has many direct calls to the store via actions
   - Consider implementing a facade/adapter pattern for cleaner store access

8. **Remove Direct DOM References**
   - Check for and remove any direct DOM manipulation
   - Ensure all rendering goes through Phaser's systems

10. **Clean Up Getter Methods**
    - Remove unnecessary getter methods at the end of the file
    - Use dependency injection to provide components where needed

11. **Implement Command Pattern**
    - Replace direct method calls with command objects
    - This would make actions more testable and allow for undo/redo functionality

12. **Separate Concerns in Update Method**
    - The update method is mixing concerns
    - Create a dedicated update pipeline with clear responsibilities

13. **Use Proper TypeScript Interfaces**
    - Replace 'any' types with proper interfaces
    - Consider using generics for more flexible code
