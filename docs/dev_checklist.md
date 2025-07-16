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
- [ ] **Simple Room System**
  - [ ] Create basic Express server for room management
  - [ ] Room URLs: `/planet/{roomId}` (6-char random IDs like `b21244`)
  - [ ] Host creates room → gets shareable URL
  - [ ] Guest joins via URL → instant play
- [ ] **HTTP Polling Architecture**
  - [ ] Host authority: Host player's browser = game server
  - [ ] Data flow: Guest sends action → Host validates → Host updates state → Guest polls new state
  - [ ] Polling every 1-2 seconds (simple, works everywhere)
- [ ] **Multiplayer State Management**
  - [ ] Extend existing Zustand store with multiplayer fields:
    - [ ] `isHost: boolean`
    - [ ] `roomId: string`
    - [ ] `connectedPlayers: Player[]`
  - [ ] Host maintains authoritative game state
  - [ ] Guest receives state snapshots
- [ ] **Turn Synchronization**
  - [ ] Leverage existing `activePlayerId` system  
  - [ ] Host enforces turn order and action validation
  - [ ] Actions blocked if not your turn
- [ ] **Game Integration**
  - [ ] Wire PLAY button to create/join room flow
  - [ ] Replace wireframe planet with actual Planet B game after room join
  - [ ] Use existing ecosystem simulation + Phaser rendering
  - [ ] TODO: Use direct GameState access (mark with `// TODO: PlayerView when needed`)

### FOUNDATION COMPLETED ✅
- [x] **Beautiful Wireframe Homepage** - Orbitron font, interactive planet, cinematic transitions
- [x] **Ecosystem Architecture** - All game mechanics ready for multiplayer
- [x] **Pragmatic PlayerView Strategy** - Ship features over architectural purity

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