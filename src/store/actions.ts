import { useGameStore, Animal, AnimalState, Board, Biome, Coordinate, Player, Egg } from "./gameStore";
import { TerrainType } from "../types/gameTypes";
import { EcosystemController } from "../controllers/EcosystemController";
import { RESOURCE_GENERATION_PERCENTAGE } from "../constants/gameConfig";
import { MovementController } from '../controllers/MovementController';


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
 * Get the function to advance to the next turn
 */
export function getNextTurn(): () => void {
  return useGameStore.getState().nextTurn;
}

/**
 * Get the current player's ID
 */
export function getActivePlayerId(): number {
  return useGameStore.getState().activePlayerId;
}

/**
 * Get all players in the game
 */
export function getPlayers(): Player[] {
  return useGameStore.getState().players;
}

/**
 * Set the active player by ID
 * @param playerId The ID of the player to set as active
 */
export function setActivePlayer(playerId: number): void {
  useGameStore.getState().setActivePlayer(playerId);
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
 * Remove an animal from the game state by ID.
 */
export function removeAnimal(id: string): void {
  useGameStore.setState(state => ({ animals: state.animals.filter(a => a.id !== id) }));
}

/**
 * Add a new animal to the game state.
 */
export function addAnimal(animal: Animal): void {
  useGameStore.getState().addAnimal(animal);
}

/**
 * Evolve an animal by ID
 */
export async function evolveAnimal(id: string): Promise<void> {
  const state = useGameStore.getState();
  const unit = state.animals.find(a => a.id === id);
  if (!unit) {
    throw new Error(`EvolveAnimal failed: animal ${id} not found`);
  }
  if (unit.state !== AnimalState.DORMANT) {
    throw new Error(`EvolveAnimal failed: animal ${id} is not dormant`);
  }
  state.evolveAnimal(id);
  // Remove the egg from state now that it has evolved
}

/**
 * Get the currently selected unit ID
 */
export function getSelectedUnitId(): string | null {
  return useGameStore.getState().selectedUnitId;
}

// =============================================================================
// EGG MANAGEMENT
// =============================================================================

/**
 * Get the number of eggs in a specific biome.
 */
export function getEggCountForBiome(biomeId: string): number {
  const eggs = useGameStore.getState().eggs;
  return Object.values(eggs).filter(e => e.biomeId === biomeId).length;
}

/**
 * Check if a tile has an egg.
 */
export function tileHasEgg(x: number, y: number): boolean {
  const eggs = useGameStore.getState().eggs;
  return Object.values(eggs).some(e => e.position.x === x && e.position.y === y);
}

/**
 * Add an egg to the game state.
 */
export function addEgg(egg: Egg): void {
  useGameStore.getState().addEgg(egg);
}

/**
 * Remove an egg from the game state by ID.
 */
export function removeEgg(id: string): void {
  useGameStore.setState(state => {
    const { [id]: _, ...remaining } = state.eggs;
    return { eggs: remaining };
  });
}

/**
 * Select an egg by ID or clear the selection.
 */
export function selectEgg(id: string | null): void {
  useGameStore.getState().selectEgg(id);
}

// =============================================================================
// UNIT MOVEMENT
// =============================================================================

/**
 * Select a unit and calculate its valid moves
 */
export async function selectUnit(unitId: string | null): Promise<void> {
  const state = useGameStore.getState();
  if (unitId !== null && !state.animals.some(a => a.id === unitId)) {
    throw new Error(`SelectUnit failed: animal ${unitId} not found`);
  }
  useGameStore.getState().selectUnit(unitId);
}

/**
 * Deselect the currently selected unit
 */
export async function deselectUnit(): Promise<void> {
  useGameStore.getState().selectUnit(null);
}

/**
 * Move a unit to a new position
 * @param id Unit ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export async function moveUnit(id: string, x: number, y: number): Promise<void> {
  const state = useGameStore.getState();
  const unit = state.animals.find(a => a.id === id);
  if (!unit) {
    throw new Error(`MoveUnit failed: animal ${id} not found`);
  }
  if (unit.hasMoved) {
    throw new Error(`MoveUnit failed: animal ${id} has already moved`);
  }
  if (!state.board) {
    throw new Error(`MoveUnit failed: board not initialized`);
  }
  // Recalculate legal moves directly for validation
  const legalMoves = MovementController.calculateValidMoves(unit, state.board, state.animals);
  if (!legalMoves.some(m => m.x === x && m.y === y)) {
    throw new Error(`MoveUnit failed: invalid move to (${x},${y})`);
  }
  useGameStore.getState().moveUnit(id, x, y);
}

/**
 * Move a displaced unit to a new position
 * Used by the animation system after displacement animation completes
 * @param id Unit ID
 * @param x X coordinate
 * @param y Y coordinate
 */
export async function moveDisplacedUnit(id: string, x: number, y: number): Promise<void> {
  const state = useGameStore.getState();
  const unit = state.animals.find(animal => animal.id === id);
  if (!unit) {
    throw new Error(`MoveDisplacedUnit failed: animal ${id} not found`);
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
    state.activePlayerId
  );
}

/**
 * Select a biome by ID
 * @param biomeId ID of the biome to select, or null to deselect
 */
export async function selectBiome(biomeId: string | null): Promise<void> {
  const state = useGameStore.getState();
  if (biomeId !== null && !state.biomes.has(biomeId)) {
    throw new Error(`SelectBiome failed: biome ${biomeId} not found`);
  }
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
    state.activePlayerId
  );
}

/**
 * Capture a biome by setting its owner via pure compute and state commit
 * @param biomeId ID of the biome to capture
 */
export async function captureBiome(biomeId: string): Promise<void> {
  if (!canCaptureBiome(biomeId)) {
    throw new Error(`CaptureBiome failed: cannot capture biome ${biomeId}`);
  }
  const state = useGameStore.getState();
  // Compute capture effects purely
  const { animals: newAnimals, biomes: newBiomes } =
    EcosystemController.computeCapture(
      biomeId,
      state.animals,
      state.biomes,
      state.board!,
      state.activePlayerId,
      state.turn
    );
  // Commit updated state with new animal list (capture effects and egg ownership transfers)
  useGameStore.setState({ board: state.board!, players: state.players, biomes: newBiomes, animals: newAnimals });
  // Recalculate lushness for this biome
  await updateBiomeLushness(biomeId);
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
export async function updateBiomeLushness(biomeId: string): Promise<void> {
  const state = useGameStore.getState();
  const biome = state.biomes.get(biomeId);
  if (!biome) {
    throw new Error(`UpdateBiomeLushness failed: biome ${biomeId} not found`);
  }
  // Calculate new lushness values using the existing action helper
  const { baseLushness, lushnessBoost, totalLushness } = calculateBiomeLushness(biomeId);
  // Prepare updated biome object without eggCount
  const updatedBiome: Biome = {
    ...biome,
    baseLushness,
    lushnessBoost,
    totalLushness,
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
  return getTilesByFilter((tile, x, y) =>
    !tile.active && !tile.isHabitat && !tileHasEgg(x, y)
  );
}

/**
 * Get all tiles containing eggs
 * @returns Array of egg tiles with their positions
 */
export function getEggTiles(): TileResult[] {
  return getTilesByFilter((tile, x, y) => tileHasEgg(x, y));
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
  return getTilesByFilter((tile, x, y) =>
    tile.biomeId === biomeId &&
    !tile.active &&
    !tile.isHabitat &&
    !tileHasEgg(x, y)
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
export async function harvestTileResource(amount: number): Promise<void> {
  const state = useGameStore.getState();
  // Only proceed if a resource tile is selected
  const coord = state.selectedResource;
  if (!coord) {
    throw new Error(`HarvestTileResource failed: no resource selected`);
  }
  const board = state.board!;
  // Only allow harvesting if an active, owned unit that hasn't moved is on the tile
  const unitHere = state.animals.find(a =>
    a.position.x === coord.x && a.position.y === coord.y &&
    a.state === AnimalState.ACTIVE &&
    a.ownerId === state.activePlayerId &&
    !a.hasMoved
  );
  if (!unitHere) {
    throw new Error(`HarvestTileResource failed: no eligible unit on tile (${coord.x},${coord.y})`);
  }
  // Guard: require the biome at this tile to be owned by current player
  const tile = board.tiles[coord.y][coord.x];
  const biomeId = tile.biomeId;
  if (!biomeId || state.biomes.get(biomeId)?.ownerId !== state.activePlayerId) {
    throw new Error(`HarvestTileResource failed: tile (${coord.x},${coord.y}) not in owned biome`);
  }
   
  // Compute new state via pure controller logic
  const { board: newBoard, players: newPlayers, biomes: newBiomes } =
    EcosystemController.computeHarvest(
      coord,
      board,
      state.players,
      state.activePlayerId,
      state.biomes,
      amount
    );
  // Always mark the harvesting unit as having moved
  const updatedAnimals = state.animals.map(a =>
    a.id === unitHere.id
      ? { ...a, hasMoved: true }
      : a
  );
  // Commit updated state
  useGameStore.setState({ board: newBoard, players: newPlayers, biomes: newBiomes, animals: updatedAnimals });
  // Refresh lushness for this biome
  if (tile.biomeId) {
    await updateBiomeLushness(tile.biomeId);
  }
}

/**
 * Select a resource tile for harvesting
 * @param coord Coordinates of the resource tile or null to clear selection
 */
export async function selectResourceTile(coord: Coordinate | null): Promise<void> {
  const state = useGameStore.getState();
  if (coord !== null) {
    const board = state.board;
    if (!board || coord.x < 0 || coord.x >= board.width || coord.y < 0 || coord.y >= board.height) {
      throw new Error(`SelectResourceTile failed: invalid coordinate (${coord.x},${coord.y})`);
    }
  }
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
  terrainData: TerrainType[][],
  resourceChance: number = RESOURCE_GENERATION_PERCENTAGE
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
    biomesMap,
    resourceChance
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
export async function clearDisplacementEvent(): Promise<void> {
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
export async function recordSpawnEvent(unitId: string): Promise<void> {
  const state = useGameStore.getState();
  if (!state.animals.some(a => a.id === unitId)) {
    throw new Error(`RecordSpawnEvent failed: animal ${unitId} not found`);
  }
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
export async function clearSpawnEvent(): Promise<void> {
  useGameStore.setState({
    spawnEvent: {
      occurred: false,
      unitId: null,
      timestamp: null
    }
  });
}

/**
 * Update multiple tiles' visibility states in a single operation
 * @param tiles Array of tile positions with visibility states to update
 */
export async function updateTilesVisibility(tiles: { x: number; y: number; visible: boolean }[]): Promise<void> {
  // No work if nothing changed
  if (tiles.length === 0) return;
  useGameStore.setState(state => {
    const activePlayerId = state.activePlayerId;
    // Update only the active player's fog-of-war sets
    const updatedPlayers = state.players.map(player => {
      if (player.id !== activePlayerId) return player;
      const newExplored = new Set(player.exploredTiles);
      const newVisible = new Set(player.visibleTiles);
      for (const { x, y, visible } of tiles) {
        const key = `${x},${y}`;
        newExplored.add(key);
        if (visible) newVisible.add(key);
        else newVisible.delete(key);
      }
      return { ...player, exploredTiles: newExplored, visibleTiles: newVisible };
    });
    return { players: updatedPlayers };
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

/**
 * Update resources and egg production for a single player's owned biomes at the start of their turn.
 * @param playerId The ID of the player whose biomes to update.
 */
export async function updatePlayerBiomes(playerId: number): Promise<void> {
  const state = useGameStore.getState();
  const turn = state.turn;
  const board = state.board!;
  const allBiomes = state.biomes;
  const animals = state.animals;

  // Filter to only this player's biomes
  const playerBiomes = new Map<string, Biome>();
  allBiomes.forEach((b, id) => {
    if (b.ownerId === playerId) {
      playerBiomes.set(id, b);
    }
  });

  // Regenerate resources only for these biomes
  const newBoard = EcosystemController.regenerateResources(board, playerBiomes);
  
  // Produce eggs only for these biomes
  const { animals: postEggAnimals, biomes: postEggBiomes, eggs: newEggs } = EcosystemController.biomeEggProduction(
    turn,
    animals,
    playerBiomes,
    newBoard
  );

  // Add newly produced eggs to state
  newEggs.forEach(animal => {
    // Derive biomeId from the new board
    const tile = newBoard.tiles[animal.position.y][animal.position.x];
    const egg: Egg = {
      id: animal.id,
      ownerId: animal.ownerId!,
      position: animal.position,
      biomeId: tile.biomeId!,
      createdAtTurn: turn,
    };
    addEgg(egg);
  });

  // Merge updated biomes back into full map
  const mergedBiomes = new Map(allBiomes);
  postEggBiomes.forEach((b, id) => mergedBiomes.set(id, b));

  // Recalculate lushness for all biomes
  const newBiomes = EcosystemController.recalcLushnessState(newBoard, mergedBiomes);

  // Commit the partial update
  useGameStore.setState({
    board: newBoard,
    animals: postEggAnimals,
    biomes: newBiomes
  });
}

// Add a new action to reset movement flags and clear events for a single player's turn
export function resetPlayerMovementAndEvents(playerId: number): void {
  useGameStore.setState((state) => ({
    animals: state.animals.map(a =>
      a.ownerId === playerId ? { ...a, hasMoved: false } : a
    ),
    displacementEvent: { occurred: false, unitId: null, fromX: null, fromY: null, toX: null, toY: null, timestamp: null },
    spawnEvent: { occurred: false, unitId: null, timestamp: null },
    biomeCaptureEvent: { occurred: false, biomeId: null, timestamp: null }
  }));
}

// Add a new action to mark all units of the given player as moved
export function markPlayerUnitsMoved(playerId: number): void {
  useGameStore.setState((state) => ({
    animals: state.animals.map(a =>
      a.ownerId === playerId ? { ...a, hasMoved: true } : a
    )
  }));
}

/**
 * Get all tiles currently visible to the given player
 */
export function getVisibleTilesForPlayer(playerId: number): { x: number; y: number }[] {
  const state = useGameStore.getState();
  if (!state.board) return [];
  if (!state.fogOfWarEnabled) {
    // FOW disabled: all tiles are visible
    const tiles: { x: number; y: number }[] = [];
    for (let y = 0; y < state.board.height; y++) {
      for (let x = 0; x < state.board.width; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  return Array.from(player.visibleTiles).map(str => {
    const [x, y] = str.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Get all tiles explored by the given player
 */
export function getExploredTilesForPlayer(playerId: number): { x: number; y: number }[] {
  const state = useGameStore.getState();
  if (!state.board) return [];
  if (!state.fogOfWarEnabled) {
    // FOW disabled: all tiles are explored
    const tiles: { x: number; y: number }[] = [];
    for (let y = 0; y < state.board.height; y++) {
      for (let x = 0; x < state.board.width; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];
  return Array.from(player.exploredTiles).map(str => {
    const [x, y] = str.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Set the global fog of war enabled/disabled state
 */
export function setFogOfWarEnabled(enabled: boolean): void {
  useGameStore.getState().toggleFogOfWar(enabled);
}

/**
 * Get the current fog of war enabled/disabled state
 */
export function getFogOfWarEnabled(): boolean {
  return useGameStore.getState().fogOfWarEnabled;
}