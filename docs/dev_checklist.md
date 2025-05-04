# Development Checklist

## Future Tasks

- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Really fix the displacement issue
- [ ] Buffalo can harvest more

- [ ] Style edges of owned biomes (flood fill with stroke)
  - [ ] Determine graphical approach

- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade


- [ ]Move these into a gamedata.ts (from gamestore)
export enum TerrainType { ... }
export enum ResourceType { ... }
export enum AnimalState { ... }  <-- This one seems problematic
export const SPECIES_REGISTRY: Record<string, AnimalAbilities> = { ... }
export const TERRAIN_ANIMAL_MAP: Record<TerrainType, string> = { ... }
export const DEFAULT_ABILITIES: AnimalAbilities = { ... }
export const BIOME_TERRAIN_ORDER: TerrainType[] = [ ... ]

- [ ] Move this into a gamconfig (from gamestore)
export const NODE_DISTANCE_THRESHOLD = 3;
