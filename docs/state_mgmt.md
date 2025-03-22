# State Management

## Architecture Principles (As Defined)
- ✅ Phaser renders tiles, not React → No unnecessary React re-renders
- ✅ Zustand handles state → No need for prop drilling or React updates
- ✅ Phaser subscribes to state → Tiles update only when needed, not every frame
- ✅ React only controls UI → Buttons, menus, etc., remain separate from game rendering


## Architectural Violations
### Missing Subscription Mechanism
### Bidirectional Data Flow
### Event Handling Violations

## Game.tsx Subscription Issues

## Game Architecture

1. **Subscription Model**
   - Implement a proper Observer pattern for Phaser to subscribe to state changes
   - Remove all direct `getState()` calls from Phaser code

2. **Unidirectional Data Flow**
   - React/UI → triggers state changes in Zustand
   - Zustand → notifies subscribers of changes 
   - Phaser → renders based on received state updates

3. **Event Delegation**
   - Phaser should emit events when user interacts with game objects
   - React components should listen for these events and update state accordingly
   - Zustand actions should only be called from React components

4. **Clear Separation of Concerns**
   - Phaser: Rendering and input handling only
   - Zustand: State management only
   - React: UI rendering and state update triggers only 