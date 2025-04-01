# Development Checklist

## Upcoming Tasks
  - [ ] Track visibility changes for fog of war state / generally connect it to zustand

## Playable Game Tasks
- [ ] Fix habitat/unit bug
- [x] Players can only improve habitat on their next turn and that ends their turn

## Habitat Selection System Overhaul

### Phase 1: Selection Context Model (Foundation)
- [ ] Create SelectionContext Interface
  - [ ] Define unified selection model in gameStore.ts
  - [ ] Include fields for type (unit/habitat/tile), ID, position, eligibleActions
  - [ ] Add to GameState interface
  - [ ] Test: Verify state model structure without changing functionality

- [ ] Implement Basic Context Updates
  - [ ] Create updateSelectionContext action in actions.ts
  - [ ] Add helper functions for common selection types
  - [ ] Test: Console log selection changes, verify tracking works

- [ ] Migrate UI to Use Context
  - [ ] Update UIScene to subscribe to selectionContext
  - [ ] Modify button visibility logic based on eligibleActions
  - [ ] Test: Verify buttons appear/disappear appropriately

### Phase 2: Improve Click Handling
- [ ] Refactor Tile Click Handler
  - [ ] Rewrite handleTileClick to use the selection context
  - [ ] Implement a prioritized selection system (unit→habitat→tile)
  - [ ] Test: Click through tiles/units/habitats and verify correct selection

- [ ] Implement Double-Click Detection
  - [ ] Add double-click detection in InputManager
  - [ ] Create separate handlers for single vs. double clicks
  - [ ] Test: Verify double-clicks are detected correctly

- [ ] Implement Context-Aware Actions
  - [ ] Connect double-clicks to appropriate actions based on context
  - [ ] Add action validation at selection time
  - [ ] Test: Double-click on valid/invalid habitats, verify behavior

### Phase 3: Visual Feedback & Polish
- [ ] Enhance Selection Indicators
  - [ ] Update SelectionRenderer to use selection context
  - [ ] Add different visual indicators for selection types
  - [ ] Test: Verify visual feedback matches context type

- [ ] Implement State Transitions
  - [ ] Create explicit transitions between selection states
  - [ ] Add focus ring for the active selection
  - [ ] Test: Verify selection flows logically and visually

- [ ] Implement Keyboard Shortcuts
  - [ ] Update keyboard handlers to use selection context
  - [ ] Implement action keys (I, S, etc.) as context-aware actions
  - [ ] Test: Verify keyboard shortcuts work appropriately

### Phase 4: Integration & Cleanup
- [ ] Implement Turn Management
  - [ ] Integrate actions with turn management logic
  - [ ] Ensure habitat improvement ends turn
  - [ ] Test: Verify turn flow and state preservation

- [ ] Cleanup Legacy Selection Code
  - [ ] Remove deprecated selection flags and methods
  - [ ] Update documentation
  - [ ] Test: Ensure no regression in core gameplay

- [ ] Final Integration Test
  - [ ] Create test scenario covering key gameplay flows
  - [ ] Verify all selection transitions, actions, and feedback
  - [ ] Test: Playtest a full game cycle, verifying selection behaviors