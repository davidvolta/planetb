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


## REFACTORING

### CRITICAL ARCHITECTURE FIXES (Fix First) 🔥
- [x] **Omniscient State Access Pattern** - MOST CRITICAL ✅ **MAJOR PROGRESS**
  - [x] Enhanced existing Player View Pattern in `src/selectors/getPlayerView.ts`
  - [x] Created player-view-aware actions in `src/selectors/playerActions.ts`
  - [x] Updated TileInteractionController to use filtered player views
  - [x] Updated UIScene to use filtered player views
  - [ ] Update remaining renderers and controllers (AnimationController, GameController, etc.)
  - [ ] Fix fog-of-war security holes and performance issues
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

## TODO: Refactor Omniscient State Access to Use playerView

- [ ] All direct calls to `useGameStore.getState()` (especially in `actions.ts`)
- [ ] All selectors in `actions.ts` that return raw state (e.g. `getBoard`, `getPlayers`, `getAnimals`, `getBiomes`, `getResources`, `getActivePlayerId`, `getVisibleTilesForPlayer`)
- [ ] Any component or system that imports and uses these selectors directly (e.g. `actions.getAnimals()`, `actions.getBoard()`, etc.)
- [ ] All rendering/UI logic in scenes (e.g. `BoardScene`, `UIScene`) that uses omniscient selectors instead of `playerView`
- [ ] All controller logic (e.g. `TileInteractionController`, `GameController`) that uses omniscient selectors instead of being passed filtered data
- [ ] Any utility or helper that assumes omniscient state

**Specific files/areas to audit and refactor:**
- [ ] `src/store/actions.ts` (all selectors and state queries)
- [ ] `src/scene/BoardScene.ts` (look for any use of `actions.get*` or direct state access)
- [ ] `src/controllers/TileInteractionController.ts`
- [ ] `src/game/GameController.ts` (when implemented)
- [ ] `src/game/TurnController.ts`
- [ ] Any renderer or manager that uses omniscient selectors

**General rule:**  
> All state queries for gameplay, rendering, and UI must use `playerView` or be passed filtered data. Only dev tools and admin/debug code may use omniscient selectors.