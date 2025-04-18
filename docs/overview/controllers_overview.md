# Board Controllers

This directory contains controller modules that handle game logic and mechanics for the BoardScene.

## GameController (THIS ISN'T BUILT YET)

Manages the game state and rules logic.

### Responsibilities

- Managing turn-based gameplay flow
- Processing game actions (move, habitat creation, etc.)
- Handling action validation
- Coordinating between input, state, and visual feedback
- Applying game rules

### API

```typescript
// Main methods
initialize(): void; // Set up the controller and subscribe to events
processAction(action: GameAction): void; // Process game actions
validateMove(animalId: string, targetX: number, targetY: number): boolean; // Validate animal movement
createHabitat(x: number, y: number, biomeType: BiomeType): void; // Create a new habitat
improveHabitat(habitatId: string): void; // Upgrade an existing habitat
endTurn(): void; // End the current player's turn
getCurrentPlayer(): PlayerId; // Get the current player

// Event callbacks
onTileSelected(x: number, y: number): void; // Handle tile selection
onAnimalSelected(animalId: string): void; // Handle animal selection
onHabitatSelected(habitatId: string): void; // Handle habitat selection
```

### State Management

The GameController interacts with the state management system to:
- Update game state based on player actions
- Respond to state changes from other components
- Validate actions against current state
- Trigger state updates when game rules are applied

## EcosystemController

Manages the biome-centric ecosystem including resource generation, biome mechanics, and egg production.

### Responsibilities

- Generating and distributing resources across biomes based on terrain types
- Managing biome egg production for player-owned territories
- Selecting appropriate species based on terrain compatibility
- Determining valid egg placement locations within biomes
- Handling resource harvesting and lushness calculations
- Supporting the biome-centric architecture throughout game progression

### API

```typescript
// Resource generation and management
generateResources(width: number, height: number, terrainData: TerrainType[][]): Resource[];
regenerateAllResources(): void;
selectResourceTile(x: number, y: number): boolean;
harvestResource(resourceId: string, amount: number): boolean;

// Biome mechanics
biomeEggProduction(state: GameState): Partial<BiomeProductionResult>;
getValidEggPlacementTiles(biomeId: string, state: ValidEggPlacementState): Coordinate[];
calculateBiomeLushness(biomeId: string): number;
updateAllBiomeLushness(): void;

// Utility methods
private getSpeciesForTerrain(terrain: TerrainType): string;
```

### Biome-Centric Integration

The EcosystemController is central to the biome-centric architecture:
- It accesses habitats through their parent biomes rather than as separate entities
- It generates resources in the context of biomes, linking them to their parent biome's ID
- It produces eggs for biomes based on ownership and production rates
- It calculates lushness values for biomes based on their resource distribution
- It supports the parent-child relationship between biomes and habitats

## AnimationController

Manages animations for game entities and visual effects.

### Responsibilities

- Coordinating complex animation sequences
- Managing animation timing and synchronization
- Providing transition effects between game states
- Handling entity movement animations

### API

```typescript
// Animation control
playAnimation(type: AnimationType, target: any, duration: number): Promise<void>;
animateMovement(entityId: string, path: PathNode[], speed: number): Promise<void>;
animateCreation(entityType: string, x: number, y: number): Promise<void>;
animateAttack(sourceId: string, targetId: string): Promise<void>;

// Animation state
isAnimating(): boolean;
stopAllAnimations(): void;
setAnimationSpeed(speed: number): void;
```

### Animation Types

The AnimationController handles various types of animations:
- Movement animations for animals between grid positions
- Creation/spawn animations for new entities
- Attack and interaction animations
- Environmental effects and feedback animations
- UI transition animations

## Integration with Other Components

Controllers work with other BoardScene components:
- They use renderers to visualize game state and provide feedback
- They interact with managers to handle input, camera control, and layer management
- They communicate with the state system to update and respond to game state changes 