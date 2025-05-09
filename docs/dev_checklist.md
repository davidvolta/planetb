# Development Checklist

## ASSETS AND UI
- [ ] Change tinting mechanism to be clearer when unit can't move.
- [ ] Buffalo can harvest more

- [ ] Assets for Resources 
- [ ] Assets for Habitats (unowned, owned)

- [ ] Fix the Red selector to be a graphic/alpha
- [ ] Fix the player color to not be red (yellow?)

## COMBAT
- [ ] Animal Health
- [ ] Animal Offense
- [ ] Animal Defense
- [ ] Available Attacks / Move check

## MECHANICS
- [ ] Harvest Other Player's Resources
  - [ ] Depleted Biomes (0 Lushness) are Permanently Dead (maybe special ability to restore)


## EVOLUTION
  - [ ] Capabilites Matrix

## MULTIPLAYER
- [ ] Serialization
- [ ] Make Animals a Record, not an Array // Use the Animal Registry Approach to Sidechain it
- [ ] Make Biomes a Record, not a Map


## REFACTORING
- [ ] Rewrite TileInteractionController to fully route all click handling through the GameController facade
