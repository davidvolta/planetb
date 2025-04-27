import { useGameStore, Animal, AnimalState, Board, Biome, TerrainType, Coordinate } from "./gameStore";
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
  const state = useGameStore.getState();
  const biomeId = state.selectedBiomeId;
  if (!biomeId || !state.board) return false;
  return EcosystemController.computeCanCapture(
    biomeId,
    state.board,
    state.animals,
    state.biomes,
    state.currentPlayerId
  );
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
 * @param biomeId The ID of the biome to check (pure wrapper)
 * @returns boolean indicating if biome can be captured
 */
export function canCaptureBiome(biomeId: string): boolean {
  const state = useGameStore.getState();
  return EcosystemController.computeCanCapture(
    biomeId,
    state.board!,
    state.animals,
    state.biomes,
    state.currentPlayerId
  );
}

/**
 * Capture a biome by setting its owner via pure compute and state commit
 * @param biomeId ID of the biome to capture
 */
export function captureBiome(biomeId: string): void {
  // Only proceed if capture is valid
  if (!canCaptureBiome(biomeId)) {
    return;
  }
  const state = useGameStore.getState();
  // Compute capture effects purely
  const { animals: newAnimals, biomes: newBiomes } =
    EcosystemController.computeCapture(
      biomeId,
      state.animals,
      state.biomes,
      state.board!,
      state.currentPlayerId,
      state.turn
    );
  // Commit world changes
  useGameStore.setState({ animals: newAnimals, biomes: newBiomes });
  // Recalculate lushness for this biome
  updateBiomeLushness(biomeId);
  console.log(`Updated lushness for biome ${biomeId} after capture`);
  // Emit capture event
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
  // Pass board and biomes into the controller
  return EcosystemController.calculateBiomeLushness(
    biomeId,
    state.board!,
    state.biomes
  );
}

/**
 * Delegate lushness update to the EcosystemController.
 */
export function updateBiomeLushness(biomeId: string): void {
  const state = useGameStore.getState();
  // Calculate new lushness values using the existing action helper
  const { baseLushness, lushnessBoost, totalLushness } = calculateBiomeLushness(biomeId);
  const biome = state.biomes.get(biomeId);
  if (!biome) {
    console.warn(`Biome ${biomeId} not found, cannot update lushness`);
    return;
  }
  // Prepare updated biome object
  const updatedBiome: Biome = {
    ...biome,
    baseLushness,
    lushnessBoost,
    totalLushness,
    eggCount: biome.eggCount,
  };
  // Commit updated biomes map in one state update
  const updatedBiomes = new Map(state.biomes);
  updatedBiomes.set(biomeId, updatedBiome);
  useGameStore.setState({ biomes: updatedBiomes });
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
 * Delegate harvesting logic to the EcosystemController.
 * @param amount Number of resource units to harvest
 */
export function harvestTileResource(amount: number): void {
  const state = useGameStore.getState();
  // At this point, board is initialized and a resource tile is selected
  const coord = state.selectedResource!;
  const board = state.board!;
  // Only allow harvesting if an active, owned unit that hasn't moved is on the tile
  const unitHere = state.animals.find(a =>
    a.position.x === coord.x && a.position.y === coord.y &&
    a.state === AnimalState.ACTIVE &&
    a.ownerId === state.currentPlayerId &&
    !a.hasMoved
  );
  if (!unitHere) {
    console.warn(`Cannot harvest: no eligible (active, owned, unmoved) unit on tile (${coord.x},${coord.y})`);
    return;
  }
  // Guard: require the biome at this tile to be owned by current player
  const tile = board.tiles[coord.y][coord.x];
  const biomeId = tile.biomeId;
  if (!biomeId || state.biomes.get(biomeId)?.ownerId !== state.currentPlayerId) {
    console.warn(`Cannot harvest: tile (${coord.x},${coord.y}) not in owned biome`);
    return;
  }
   
  // Compute new state via pure controller logic
  const { board: newBoard, players: newPlayers, biomes: newBiomes } =
    EcosystemController.computeHarvest(
      coord,
      board,
      state.players,
      state.currentPlayerId,
      state.biomes,
      amount
    );
  // Only mark hasMoved if the tile is now depleted (no more resources)
  const tileAfter = newBoard.tiles[coord.y][coord.x];
  let updatedAnimals = state.animals;
  if (!tileAfter.active) {
    updatedAnimals = state.animals.map(a =>
      a.id === unitHere.id
        ? { ...a, hasMoved: true }
        : a
    );
  }
  // Commit updated state (including updated animals if any)
  useGameStore.setState({ board: newBoard, players: newPlayers, biomes: newBiomes, animals: updatedAnimals });
  // Refresh lushness for this biome
  if (tile.biomeId) {
    updateBiomeLushness(tile.biomeId);
  }
}

/**
 * Select a resource tile for harvesting
 * @param coord Coordinates of the resource tile or null to clear selection
 */
export function selectResourceTile(coord: Coordinate | null): void {
  useGameStore.getState().selectResource(coord);
}

/**
 * Get the currently selected resource tile
 */
export function getSelectedResource(): Coordinate | null {
  return useGameStore.getState().selectedResource;
}

/**
 * Reset resources with the current settings
 */
export function resetResources(
  width: number, 
  height: number, 
  terrainData: TerrainType[][]
): void {
  const state = useGameStore.getState();
  const board = state.board;
  if (!board) {
    console.warn("Board not initialized, cannot reset resources");
    return;
  }

  // Shallow-copy each tile, only overriding resource fields as needed
  const clonedTiles = board.tiles.map(row =>
    row.map(tile => ({
      ...tile,
      active: tile.isHabitat ? tile.active : false,
      resourceType: tile.isHabitat ? tile.resourceType : null,
      resourceValue: tile.isHabitat ? tile.resourceValue : 0,
    }))
  );
  const newBoard: Board = { ...board, tiles: clonedTiles };

  // Reset existing biome counts in place
  const biomesMap = state.biomes;
  biomesMap.forEach(biome => {
    biome.initialResourceCount = 0;
    biome.nonDepletedCount = 0;
    biome.totalHarvested = 0;
  });

  // Delegate resource generation to controller (mutates newBoard & biomesMap)
  EcosystemController.resetResources(
    newBoard.width,
    newBoard.height,
    terrainData,
    newBoard,
    biomesMap
  );

  // Commit new board and biomes together
  useGameStore.setState({ board: newBoard, biomes: biomesMap });

  // Update lushness for each biome
  biomesMap.forEach((_b, biomeId) => {
    updateBiomeLushness(biomeId);
  });
}


// =============================================================================
// EVENTS & TRIGGERS
// =============================================================================


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
 * Update multiple tiles' visibility states in a single operation
 * This is much more efficient than calling updateTileVisibility multiple times
 * @param tiles Array of tile positions with visibility states to update
 */
export function updateTilesVisibility(tiles: { x: number, y: number, visible: boolean }[]): void {
  const state = useGameStore.getState();
  if (!state.board || tiles.length === 0) return;

  useGameStore.setState(state => {
    const board = state.board!;    // assert non-null
    const updatedTiles = board.tiles.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        const tileUpdate = tiles.find(t => t.x === colIndex && t.y === rowIndex);
        if (!tileUpdate) return tile;
        return { ...tile, explored: true, visible: tileUpdate.visible };
      })
    );
    const newBoard: Board = {
      width: board.width,
      height: board.height,
      tiles: updatedTiles
    };
    return { board: newBoard };
  });
}

/**
 * Get all units at a given tile coordinate
 */
export function getUnitsAt(x: number, y: number): Animal[] {
  return useGameStore.getState().animals.filter(a =>
    a.position.x === x && a.position.y === y
  );
}

/**
 * Get active units at a given tile coordinate
 */
export function getActiveUnitsAt(x: number, y: number): Animal[] {
  return getUnitsAt(x, y).filter(a => a.state === AnimalState.ACTIVE);
}

/**
 * Get dormant units (eggs) at a given tile coordinate
 */
export function getDormantUnitsAt(x: number, y: number): Animal[] {
  return getUnitsAt(x, y).filter(a => a.state === AnimalState.DORMANT);
} 