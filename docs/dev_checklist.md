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
- [ ] Decouple resources from Tile (multi-phase)
  - [ ] Phase 1 – Add `resources` record slice (double-write / single-read)
  - [ ] Phase 2 – ResourceRenderer consumes `playerView.resources`
  - [ ] Phase 3 – Remove `resource*` fields from `Tile`
  - [ ] Phase 4 – EcosystemController works off resources list
  - [ ] Phase 5 – Eliminate remaining tile-resource coupling in helpers & selectors
  - [ ] Phase 6 – Cleanup, automated smoke tests & stability pass
