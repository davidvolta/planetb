import { 
  useGameStore, 
  Animal, 
  GameState, 
  AnimalState,
  Board, 
  Biome, 
  TerrainType, 
  Habitat, 
  GameConfig,
  Coordinate,
  Resource
} from "./gameStore";
import { EcosystemController } from "../controllers/EcosystemController";

/**
 * Action dispatchers for React components
 * 
 * These functions provide a centralized way to dispatch actions to the store
 * instead of having components directly call services like GameInitializer.
 */

// =============================================================================
// DATA TYPES & INTERFACES
// =============================================================================

interface BoardInitOptions {
  width: number;
  height: number;
}

/**
 * Interface for tile result with position information
 */
export interface TileResult {
  tile: any;
  x: number;
  y: number;
}

/**
 * Generic tile filter function type
 */
export type TileFilterFn = (tile: any, x: number, y: number) => boolean;

// =============================================================================
// GAME STATE MANAGEMENT
// =============================================================================

/**
 * Get the current turn number
 */
export function getTurn(): number {
  return useGameStore.getState().turn;
}

/**
 * Get the function to advance to the next turn
 */
export function getNextTurn(): () => void {
  return useGameStore.getState().nextTurn;
}

/**
 * Set up the game board with the specified dimensions and options
 */
export function setupGameBoard({ width, height }: BoardInitOptions): void {
  useGameStore.getState().initializeBoard(width, height);
}

/**
 * Get the current board state
 */
export function getBoard(): Board | null {
  return useGameStore.getState().board;
}

/**
 * Check if the game is initialized
 */
export function isInitialized(): boolean {
  return !!useGameStore.getState().isInitialized;
}

/**
 * Get the current player's ID
 */
export function getCurrentPlayerId(): number {
  return useGameStore.getState().currentPlayerId;
}

/**
 * Add a player to the game
 * @param name Player name
 * @param color Player color in hex format
 */
export function addPlayer(name: string, color: string): void {
  useGameStore.getState().addPlayer(name, color);
}

// =============================================================================
// ANIMAL & UNIT MANAGEMENT
// =============================================================================

/**
 * Get all animals in the game
 */
export function getAnimals(): any[] {
  return useGameStore.getState().animals;
}

/**
 * Evolve an animal by ID
 */
export function evolveAnimal(id: string): void {
  useGameStore.getState().evolveAnimal(id);
}

/**
 * Remove an animal from the game
 * If it's an egg (dormant animal), this will also update the board's hasEgg property
 * and update the biome's eggCount and lushnessBoost if applicable
 * @param id The ID of the animal to remove
 */
export function removeAnimal(id: string): void {
  useGameStore.getState().removeAnimal(id);
}

/**
 * Get the currently selected unit ID
 */
export function getSelectedUnitId(): string | null {
  return useGameStore.getState().selectedUnitId;
}

/**
 * Get the selected animal object
 */
export function getSelectedAnimal(): any | null {
  const id = useGameStore.getState().selectedUnitId;
  if (!id) return null;
  
  return useGameStore.getState().animals.find(a => a.id === id);
}

/**
 * Check if the selected unit is a dormant unit (egg)
 */
export function isSelectedUnitDormant(): boolean {
  return useGameStore.getState().selectedUnitIsDormant;
}

/**
 * Add a new animal to the game state
 * @param animal The animal to add
 */
export function addAnimal(animal: Animal): void {
  const animals = [...useGameStore.getState().animals, animal];
  
  useGameStore.setState({
    animals
  });
}

// =============================================================================
// UNIT MOVEMENT
// =============================================================================

/**
 * Select a unit and calculate its valid moves
 */
export function selectUnit(unitId: string | null): void {
  useGameStore.getState().selectUnit(unitId);
}

/**
 * Deselect the currently selected unit
 */
export function deselectUnit(): void {
  useGameStore.getState().selectUnit(null);
}

/**
 * Move a unit to a new position
 * @param id Unit ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export function moveUnit(id: string, x: number, y: number): void {
  useGameStore.getState().moveUnit(id, x, y);
}

/**
 * Move a displaced unit to a new position
 * Used by the animation system after displacement animation completes
 * @param id Unit ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export function moveDisplacedUnit(id: string, x: number, y: number): void {
  // Get current state
  const state = useGameStore.getState();
  
  // Find the unit to move
  const unit = state.animals.find(animal => animal.id === id);
  if (!unit) {
    console.warn(`Cannot move displaced unit ${id}: not found`);
    return;
  }
  
  // Save the original hasMoved state to preserve it
  const originalHasMoved = unit.hasMoved;
  
  // Update the unit's position in state while preserving its hasMoved state
  useGameStore.setState({
    animals: state.animals.map(animal => 
      animal.id === id 
        ? { 
            ...animal, 
            previousPosition: { ...animal.position }, // Record previous position
            position: { x, y }, // Update to new position
            hasMoved: originalHasMoved // Preserve original movement state
          } 
        : animal
    )
  });
}

/**
 * Get the valid moves for the currently selected unit
 */
export function getValidMoves(): { x: number, y: number }[] {
  return useGameStore.getState().validMoves;
}

/**
 * Check if the game is in move mode
 */
export function isMoveMode(): boolean {
  return useGameStore.getState().moveMode;
}

// =============================================================================
// BIOME & HABITAT MANAGEMENT
// =============================================================================

/**
 * Get the currently selected biome ID
 */
export function getSelectedBiomeId(): string | null {
  const biomeId = useGameStore.getState().selectedBiomeId;
  return biomeId;
}

/**
 * Check if the selected biome is available for capture
 * Returns true if the biome can be captured
 */
export function isSelectedBiomeAvailableForCapture(): boolean {
  const biomeId = getSelectedBiomeId();
  if (!biomeId) return false;
  return canCaptureBiome(biomeId);
}

/**
 * Select a biome by ID
 * @param biomeId ID of the biome to select, or null to deselect
 */
export function selectBiome(biomeId: string | null): void {
  useGameStore.getState().selectBiome(biomeId);
}

/**
 * Checks if a biome can be captured based on unit position
 * Returns true if there's an active unit on the habitat that hasn't moved yet
 * @param biomeId The ID of the biome to check
 * @returns boolean indicating if biome can be captured
 */
export function canCaptureBiome(biomeId: string): boolean {
  const state = useGameStore.getState();
  const biome = state.biomes.get(biomeId);
  
  // Exit if biome doesn't exist or already has an owner
  if (!biome || biome.ownerId !== null) {
    return false;
  }
  
  // Find any active units on this biome's habitat tile
  const unitsOnHabitat = state.animals.filter(animal => {
    // Get the tile at the animal's position
    const tile = state.board?.tiles[animal.position.y][animal.position.x];
    
    // Check if the tile is a habitat in this biome
    return tile && 
           tile.isHabitat && 
           tile.biomeId === biomeId &&
           animal.state === AnimalState.ACTIVE &&
           !animal.hasMoved &&
           animal.ownerId === state.currentPlayerId; // Must be current player's unit
  });

  return unitsOnHabitat.length > 0;
}

/**
 * Capture a biome by setting its owner
 * @param biomeId ID of the biome to capture
 */
export function captureBiome(biomeId: string): void {
  const state = useGameStore.getState();
  const biome = state.biomes.get(biomeId);
  
  // Exit if biome doesn't exist or already has an owner
  if (!biome || biome.ownerId !== null) {
    return;
  }
  
  // Get the current player ID
  const currentPlayerId = state.currentPlayerId;
  
  // Create updated biome with ownership properties
  const updatedBiome = {
    ...biome,
    ownerId: currentPlayerId,
    lastProductionTurn: state.turn - 1 // Set lastProductionTurn to previous turn for correct egg production timing
  };
  
  // Create a new Map with the updated biome
  const updatedBiomes = new Map(state.biomes);
  updatedBiomes.set(biomeId, updatedBiome);
  
  // Find the unit that is on the habitat tile
  const unitsOnHabitat = state.animals.filter(animal => {
    // Get the tile at the animal's position
    const tile = state.board?.tiles[animal.position.y][animal.position.x];
    
    // Check if the tile is a habitat in this biome
    return tile && 
           tile.isHabitat && 
           tile.biomeId === biomeId &&
           animal.state === AnimalState.ACTIVE &&
           !animal.hasMoved &&
           animal.ownerId === currentPlayerId;
  });
  
  // Update the unit's hasMoved flag
  if (unitsOnHabitat.length > 0) {
    const unitId = unitsOnHabitat[0].id; // Use the first unit if multiple
    
    const updatedAnimals = state.animals.map(animal => 
      animal.id === unitId 
        ? { ...animal, hasMoved: true } 
        : animal
    );
    
    // Update biomes and animals
    useGameStore.setState({ 
      biomes: updatedBiomes,
      animals: updatedAnimals
    });
  } else {
    // Just update biomes if no unit found
    useGameStore.setState({ 
      biomes: updatedBiomes
    });
  }
  
  // After updating the biome's owner, update its lushness values
  updateBiomeLushness(biomeId);
  console.log(`Updated lushness for biome ${biomeId} after capture`);
  
  // Record the biome capture event
  recordBiomeCaptureEvent(biomeId);
}

/**
 * Get all biomes from the game state
 */
export function getBiomes(): Map<string, Biome> {
  return useGameStore.getState().biomes;
}

/**
 * Get a specific biome by ID
 * @param id The ID of the biome to retrieve
 */
export function getBiomeById(id: string): Biome | undefined {
  return useGameStore.getState().biomes.get(id);
}

/**
 * Calculate lushness for a biome, returning all lushness values
 * @param biomeId The ID of the biome to calculate lushness for
 * @returns Object containing baseLushness, lushnessBoost, and totalLushness
 */
export function calculateBiomeLushness(biomeId: string): {
  baseLushness: number;
  lushnessBoost: number;
  totalLushness: number;
} {
  const state = useGameStore.getState();
  const biomes = state.biomes;
  
  return EcosystemController.calculateBiomeLushness(biomeId, biomes);
}

/**
 * Update a biome's lushness values
 * @param biomeId The ID of the biome to update
 */
export function updateBiomeLushness(biomeId: string): void {
  // Get current state
  const state = useGameStore.getState();
  const biome = state.biomes.get(biomeId);
  
  if (!biome) {
    console.warn(`Biome ${biomeId} not found, cannot update lushness`);
    return;
  }
  
  // Calculate new lushness values using the central calculation function
  const lushnessValues = calculateBiomeLushness(biomeId);
  
  // Create updated biome with new lushness values
  const updatedBiome = {
    ...biome,
    baseLushness: lushnessValues.baseLushness,
    lushnessBoost: lushnessValues.lushnessBoost,
    totalLushness: lushnessValues.totalLushness,
    eggCount: biome.eggCount
  };
  
  // Get all biomes
  const biomes = new Map(state.biomes);
  
  // Update the biome in the map
  biomes.set(biomeId, updatedBiome);
  
  // Update the biomes in the store
  useGameStore.setState({
    biomes
  });
}

/**
 * Process egg production for all biomes
 * Produces eggs in biomes based on their production rate
 */
export function produceEggs(applyToState: boolean = true): void {
  const state = useGameStore.getState();
  const result = EcosystemController.biomeEggProduction(
    state.turn,
    state.animals,
    state.biomes,
    state.board!
  );
  
  // Apply the changes to the state
  if (result.animals && result.biomes) {
    useGameStore.setState({
      animals: result.animals,
      biomes: result.biomes
    });
  }
}

// =============================================================================
// TILE & RESOURCE MANAGEMENT
// =============================================================================

/**
 * Get all tiles from the game board
 * @returns Array of tiles with their positions
 */
export function getTiles(): TileResult[] {
  const state = useGameStore.getState();
  if (!state.board) return [];
  
  const tiles: TileResult[] = [];
  
  // Scan all tiles
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      const tile = state.board.tiles[y][x];
      tiles.push({
        tile,
        x,
        y
      });
    }
  }
  
  return tiles;
}

/**
 * Get tiles that match a specified filter condition
 * @param filterFn Function that returns true for tiles to include
 * @returns Array of filtered tiles with their positions
 */
export function getTilesByFilter(filterFn: TileFilterFn): TileResult[] {
  const state = useGameStore.getState();
  if (!state.board) return [];
  
  const filteredTiles: TileResult[] = [];
  
  // Apply filter to all tiles
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      const tile = state.board.tiles[y][x];
      if (filterFn(tile, x, y)) {
        filteredTiles.push({
          tile,
          x,
          y
        });
      }
    }
  }
  
  return filteredTiles;
}

/**
 * Get all blank tiles (no resources, not habitats, no eggs)
 * @returns Array of blank tiles with their positions
 */
export function getBlankTiles(): TileResult[] {
  return getTilesByFilter((tile) => 
    !tile.active && !tile.isHabitat && !tile.hasEgg
  );
}

/**
 * Get all tiles containing eggs
 * @returns Array of egg tiles with their positions
 */
export function getEggTiles(): TileResult[] {
  return getTilesByFilter((tile) => tile.hasEgg);
}

/**
 * Get all habitat tiles
 * @returns Array of habitat tiles with their positions
 */
export function getHabitatTiles(): TileResult[] {
  return getTilesByFilter((tile) => tile.isHabitat);
}

/**
 * Get all tiles for a specific biome
 * @param biomeId The ID of the biome
 * @returns Array of tiles belonging to the biome with their positions
 */
export function getTilesForBiome(biomeId: string): TileResult[] {
  return getTilesByFilter((tile) => tile.biomeId === biomeId);
}

/**
 * Get all tiles with a specific terrain type
 * @param terrainType The terrain type to filter by
 * @returns Array of tiles with the specified terrain type
 */
export function getTilesByTerrain(terrainType: TerrainType): TileResult[] {
  return getTilesByFilter((tile) => tile.terrain === terrainType);
}

/**
 * Get blank tiles suitable for egg placement in a specific biome
 * @param biomeId The ID of the biome
 * @returns Array of blank tiles in the biome suitable for egg placement
 */
export function getEggPlacementTiles(biomeId: string): TileResult[] {
  return getTilesByFilter((tile) => 
    tile.biomeId === biomeId && 
    !tile.active && 
    !tile.isHabitat && 
    !tile.hasEgg
  );
}

/**
 * Get all resource tiles from the game board
 */
export function getResourceTiles(): TileResult[] {
  return getTilesByFilter((tile) => 
    tile.active && tile.resourceType !== null
  );
}

/**
 * Get resource tiles belonging to a specific biome
 * @param biomeId The ID of the biome to retrieve resources for
 */
export function getResourceTilesForBiome(biomeId: string): TileResult[] {
  return getTilesByFilter((tile) => 
    tile.biomeId === biomeId && 
    tile.active && 
    tile.resourceType !== null
  );
}

/**
 * Select a resource tile at the given coordinates
 */
export function selectResourceTile(x: number, y: number): boolean {
  const state = useGameStore.getState();
  if (!state.board) return false;
  
  const tile = state.board.tiles[y][x];
  
  // Only allow selecting tiles with active resources
  if (!tile.active || !tile.resourceType) {
    return false;
  }
  
  // TODO: Implement resource tile selection logic
  console.log(`Selected resource tile at (${x}, ${y}) of type ${tile.resourceType} with value ${tile.resourceValue}`);
  return true;
}

/**
 * Harvest a specific amount from a resource tile
 * @param x X coordinate of the resource tile
 * @param y Y coordinate of the resource tile
 * @param amount Amount to harvest (0-10)
 * @returns Whether the harvest was successful
 */
export function harvestResourceTile(x: number, y: number, amount: number): boolean {
  const state = useGameStore.getState();
  if (!state.board) return false;
  
  const tile = state.board.tiles[y][x];
  
  // Can only harvest active resources
  if (!tile.active || !tile.resourceType) {
    console.warn(`No active resource at (${x}, ${y})`);
    return false;
  }
  
  // Validate amount
  if (amount < 0 || amount > tile.resourceValue) {
    console.warn(`Invalid harvest amount: ${amount}, resourceValue: ${tile.resourceValue}`);
    return false;
  }
  
  // Get the biome this tile belongs to
  const biomeId = tile.biomeId;
  if (!biomeId) {
    console.warn(`Tile at (${x}, ${y}) does not belong to a biome`);
    return false;
  }
  
  // Get the biome
  const biome = state.biomes.get(biomeId);
  if (!biome) {
    console.warn(`Biome ${biomeId} not found`);
    return false;
  }
  
  // Check if this will deplete the resource
  const willBeDepleted = (tile.resourceValue - amount) <= 0;
  
  // Create updated biome with increased totalHarvested
  const updatedBiome = {
    ...biome,
    totalHarvested: biome.totalHarvested + amount
  };
  
  // If resource will be depleted, decrease nonDepletedCount
  if (willBeDepleted) {
    updatedBiome.nonDepletedCount = Math.max(0, biome.nonDepletedCount - 1);
  }
  
  // Update the biome in the map
  const updatedBiomes = new Map(state.biomes);
  updatedBiomes.set(biomeId, updatedBiome);
  
  // Update the tile's resource value
  const newValue = tile.resourceValue - amount;
  const updatedTile = {
    ...tile,
    resourceValue: newValue
  };
  
  // If resource is fully depleted, set tile to inactive
  if (newValue <= 0) {
    updatedTile.active = false;
    updatedTile.resourceType = null;
  }
  
  // Create updated board with the modified tile
  const updatedBoard = { ...state.board };
  updatedBoard.tiles[y][x] = updatedTile;
  
  // Update the state
  useGameStore.setState({
    board: updatedBoard,
    biomes: updatedBiomes
  });
  
  // Recalculate lushness for the biome to reflect the resource change
  const baseLushness = calculateBiomeLushness(biomeId);
  updateBiomeLushness(biomeId);
  
  return true;
}

/**
 * Regenerate resources with the current settings
 */
export function regenerateResources(
  width: number, 
  height: number, 
  terrainData: TerrainType[][]
): void {
  const state = useGameStore.getState();
  
  if (!state.board) {
    console.warn("Board not initialized, cannot regenerate resources");
    return;
  }
  
  // First, clear all existing resources
  // Reset all resource properties on tiles
  const updatedBoard = { ...state.board };
  
  // Reset resource properties across the board first
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = updatedBoard.tiles[y][x];
      
      // Skip habitat tiles
      if (tile.isHabitat) continue;
      
      // Reset resource properties
      updatedBoard.tiles[y][x] = {
        ...tile,
        active: false,
        resourceType: null,
        resourceValue: 0
      };
    }
  }
  
  // Reset resource counts in biomes
  const resetBiomes = new Map<string, Biome>();
  state.biomes.forEach((biome, biomeId) => {
    resetBiomes.set(biomeId, {
      ...biome,
      initialResourceCount: 0,
      nonDepletedCount: 0
    });
  });
  
  // Update state with cleared resources and reset counts
  useGameStore.setState({
    board: updatedBoard,
    biomes: resetBiomes
  });
  
  // Generate resources by setting tile properties directly
  // This will also update initialResourceCount and nonDepletedCount
  EcosystemController.regenerateResources(
    width,
    height,
    terrainData,
    updatedBoard, // Use the updated board we just cleared
    resetBiomes
  );
  
  // Update the board and biomes in the store since tile properties have changed
  useGameStore.setState({
    board: { ...updatedBoard },
    biomes: resetBiomes
  });
}

/**
 * Regenerate resources based on biome lushness
 * This is a placeholder - will be implemented in Phase 5
 */
export function regenerateAllResourcesByLushness(): void {
  const state = useGameStore.getState();
  
  if (!state.board) {
    console.warn("Board not initialized, cannot regenerate resources");
    return;
  }
  
  // TODO: Implement tile resource regeneration based on biome lushness
  console.log("Resource regeneration based on lushness not yet implemented");
}

// =============================================================================
// EVENTS & TRIGGERS
// =============================================================================

/**
 * Get information about the current displacement event
 */
export function getDisplacementEvent(): any {
  return useGameStore.getState().displacementEvent;
}

/**
 * Clear the current displacement event
 */
export function clearDisplacementEvent(): void {
  useGameStore.setState({
    displacementEvent: {
      occurred: false,
      unitId: null,
      fromX: null,
      fromY: null,
      toX: null,
      toY: null,
      timestamp: null
    }
  });
}

/**
 * Get information about the current spawn event
 */
export function getSpawnEvent(): any {
  return useGameStore.getState().spawnEvent;
}

/**
 * Record a spawn event in the state
 * @param unitId ID of the unit that was spawned
 */
export function recordSpawnEvent(unitId: string): void {
  useGameStore.setState({
    spawnEvent: {
      occurred: true,
      unitId: unitId,
      timestamp: Date.now()
    }
  });
}

/**
 * Clear the current spawn event
 */
export function clearSpawnEvent(): void {
  useGameStore.setState({
    spawnEvent: {
      occurred: false,
      unitId: null,
      timestamp: null
    }
  });
}

/**
 * Records a biome capture event in the state
 * This will trigger animations and effects when a biome is captured
 */
export function recordBiomeCaptureEvent(biomeId: string): void {
  useGameStore.setState({
    biomeCaptureEvent: {
      occurred: true,
      biomeId: biomeId,
      timestamp: Date.now()
    }
  });
}

/**
 * Clears the biome capture event from the state
 * Called after the event has been processed by subscriptions
 */
export function clearBiomeCaptureEvent(): void {
  useGameStore.setState({
    biomeCaptureEvent: {
      occurred: false,
      biomeId: null,
      timestamp: null
    }
  });
}

/**
 * Get the total resource count for a biome
 * @param biomeId ID of the biome to get resource count for
 * @returns Total number of resources (active and depleted) in the biome
 */
export function getBiomeResourceCount(biomeId: string): number {
  const state = useGameStore.getState();
  
  if (!state.board || !state.biomes.has(biomeId)) {
    return 0;
  }
  
  return state.biomes.get(biomeId)!.initialResourceCount;
}

/**
 * Get the non-depleted resource count for a biome
 * @param biomeId ID of the biome to get active resource count for
 * @returns Number of non-depleted resources in the biome
 */
export function getBiomeNonDepletedResourceCount(biomeId: string): number {
  const state = useGameStore.getState();
  
  if (!state.board || !state.biomes.has(biomeId)) {
    return 0;
  }
  
  // We can either use the cached value in the biome
  return state.biomes.get(biomeId)!.nonDepletedCount;
  
  // Or recalculate it
  // return EcosystemController.getBiomeNonDepletedResourceCount(biomeId, state.board);
}

/**
 * Get the total harvested resources for a biome
 * @param biomeId ID of the biome to get harvested resource count for
 * @returns Total amount of resources harvested from the biome
 */
export function getBiomeTotalHarvested(biomeId: string): number {
  const state = useGameStore.getState();
  
  if (!state.biomes.has(biomeId)) {
    return 0;
  }
  
  return state.biomes.get(biomeId)!.totalHarvested;
}

/**
 * Updates the resource counts for all biomes
 * Call this after any changes to resources to ensure counts stay accurate
 */
export function updateAllBiomeResourceCounts(): void {
  const state = useGameStore.getState();
  
  if (!state.board) {
    return;
  }
  
  const updatedBiomes = EcosystemController.updateAllBiomeResourceCounts(state.biomes, state.board);
  
  // Update the biomes in the store
  useGameStore.setState({
    biomes: updatedBiomes
  });
}

/**
 * Update multiple tiles' visibility states in a single operation
 * This is much more efficient than calling updateTileVisibility multiple times
 * @param tiles Array of tile positions with visibility states to update
 */
export function updateTilesVisibility(tiles: { x: number, y: number, visible: boolean }[]): void {
  const state = useGameStore.getState();
  if (!state.board || tiles.length === 0) return;
  
  // Update all the specified tiles in a single state update
  useGameStore.setState(state => {
    // Return if no board
    if (!state.board) return state;
    
    // Create a deep copy of the board to avoid mutating it directly
    const newBoard = {
      ...state.board,
      tiles: state.board.tiles.map((row, rowIndex) => {
        // Check if this row contains any tiles we need to update
        const anyUpdatesInRow = tiles.some(tile => tile.y === rowIndex);
        
        // If no updates in this row, return it unchanged
        if (!anyUpdatesInRow) return row;
        
        // Otherwise process the row to update specific tiles
        return row.map((tile, colIndex) => {
          // Find if this tile position should be updated
          const tileUpdate = tiles.find(t => 
            t.y === rowIndex && t.x === colIndex
          );
          
          // If this tile doesn't need an update, return it unchanged
          if (!tileUpdate) return tile;
          
          // Otherwise update the tile
          return {
            ...tile,
            explored: true, // Once a tile is explored, it stays explored
            visible: tileUpdate.visible
          };
        });
      })
    };
    
    return { board: newBoard };
  });
} 