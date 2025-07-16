# Development Checklist

## ASSETS AND UI
- [ ] Change tinting mechanism to be clearer when unit can't move
- [ ] Assets for Habitats (unowned, owned)

## COMBAT
- [ ] Animal Health
- [ ] Animal Offense
- [ ] Animal Defense
- [ ] Available Attacks / Move check

## HARVEST
- [ ] Harvest Other Player's Resources
  - [ ] Depleted Biomes (0 Lushness) are Permanently Dead (maybe special ability to restore)
- [ ] Buffalo can harvest more

## EVOLUTION
  - [ ] Capabilites Matrix

## MULTIPLAYER
- [ ] Serialization
- [ ] Make Animals a Record, not an Array //   the Animal Registry Approach to Sidechain it
- [ ] Make Biomes a Record, not a Map


## MULTIPLAYER "PLAY WITH A FRIEND" IMPLEMENTATION 🎮

### NEXT STEPS - HIGH PRIORITY 🔥
- [X] **Simple Room System**
- [X] **HTTP Polling Architecture** (Basic implementation complete)
- [ ] **PVPONLINE Game Mode**
  - [ ] Create new `PVPONLINE` game mode toggle
  - [ ] Ensure existing PVP local mode remains intact
  - [ ] Switch multiplayer games to use PVPONLINE mode
- [ ] **Turn Synchronization for Online PVP**
  - [ ] Rebuild turn controller for online alternating turns
  - [ ] Host enforces turn order and action validation
  - [ ] Actions blocked if not your turn
  - [ ] Guest waits for host state updates between turns
- [ ] **Game Integration**
  - [ ] Wire PLAY button to create/join room flow
  - [ ] Replace wireframe planet with actual Planet B game after room join
  - [ ] Use existing ecosystem simulation + Phaser rendering
  - [ ] TODO: Use direct GameState access (mark with `// TODO: PlayerView when needed`)

### MULTIPLAYER IMPROVEMENTS (Future)
- [ ] **State Serialization Improvements**
  - [ ] Create serialization helpers for Map/Set structures
  - [ ] Add state diffing to reduce payload size
  - [ ] Implement delta updates instead of full state sync
- [ ] **Action Queue System**
  - [ ] Add simple action queue for async moves
  - [ ] Handle action validation and rejection
- [ ] **State Sharing Optimization**
  - [ ] PlayerView-aware state filtering for privacy
  - [ ] Compression for large game states


## REFACTORING

### CRITICAL ARCHITECTURE FIXES (Fix First) 🔥
- [ ] **Circular Dependencies & Tight Coupling**
  - [ ] Create `src/store/commands/` for business logic
  - [ ] Keep `actions/` for pure state mutations only
  - [ ] Break action → controller → action circular dependencies
- [ ] **Inconsistent Async Patterns**
  - [ ] Make all state-changing actions async with clear boundaries
  - [ ] Add proper loading states and action queuing
  - [ ] Fix race conditions in state updates

### HIGH PRIORITY FIXES ⚠️
- [ ] **Error Boundaries**
  - [ ] Create `src/utils/ErrorBoundary.ts` with proper error handling
  - [ ] Wrap all actions with try/catch and fallback behaviors
  - [ ] Add user-friendly error messages instead of crashes
- [ ] **Animation/State Coordination**
  - [ ] Separate AnimationController from state updates
  - [ ] Make animations purely cosmetic, state updates immediate
  - [ ] Fix desynchronization between visual and game state
- [ ] **State Mutation Anti-patterns**
  - [ ] Standardize state mutation patterns
  - [ ] Remove direct setState calls mixed with pure functions
  - [ ] Implement consistent state update flow


### MEDIUM PRIORITY FIXES 📋
- [ ] **Memory Leaks in State Subscriptions**
  - [ ] Fix StateObserver subscription cleanup
  - [ ] Add proper component disposal patterns
  - [ ] Monitor and prevent subscription leaks
- [ ] **Inconsistent Data Structures**
  - [ ] Standardize animals/biomes/eggs data structures
  - [ ] Choose between Arrays, Maps, Records consistently
  - [ ] Optimize for performance and maintainability
- [ ] **Testing Infrastructure**
  - [ ] Add vitest or jest testing framework
  - [ ] Create action unit tests
  - [ ] Add controller integration tests

### EXISTING REFACTORING TASKS
- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade


**Remaining files to update (lower priority):**
- [ ] `src/scene/BoardScene.ts` (rendering optimizations)
- [ ] `src/game/TurnController.ts` (admin functions can remain omniscient)
- [ ] Animation and rendering systems (cosmetic, not security-critical)