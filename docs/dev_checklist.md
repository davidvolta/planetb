# Development Checklist

## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade

- [ ] Move these into a new gameTypes.ts (from gamestore)
export enum TerrainType { ... }
export enum ResourceType { ... }
export const SPECIES_REGISTRY: Record<string, AnimalAbilities> = { ... }
export const TERRAIN_ANIMAL_MAP: Record<TerrainType, string> = { ... }
export const DEFAULT_ABILITIES: AnimalAbilities = { ... }
export const BIOME_TERRAIN_ORDER: TerrainType[] = [ ... ]

- [ ] Move this into a gamconfig (from gamestore)
export const NODE_DISTANCE_THRESHOLD = 3;

// Egg/Animal model refactor
- [ ] Refactor egg/animal model:
  - [ ] Introduce `Egg` type; add `eggs: Egg[]` and `selectedEggId: string | null` to GameState; remove `AnimalState` enum and `state` field.
  - [ ] Add `selectEgg(id: string | null)` action; update `evolveAnimal(id)` to remove egg and create Animal.
  - [ ] Replace all `AnimalState.DORMANT` checks with egg lookups; swap `selectedUnitIsDormant` for `selectedEggId`; update renderers, controllers, UI, and subscriptions.
