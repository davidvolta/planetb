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