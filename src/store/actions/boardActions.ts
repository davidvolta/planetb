import { useGameStore, Board, Tile } from '../gameStore';
import { BoardController } from '../../controllers/BoardController';
import { resetResources } from './resourceActions';

export interface BoardInitOptions {
  width: number;
  height: number;
}

/**
 * Set up the game board with the specified dimensions and options
 */
export function setupGameBoard({ width, height }: BoardInitOptions): void {
  const state = useGameStore.getState();
  const { board, animals, biomes, updatedPlayers } = BoardController.initializeBoard(width, height, state.players);
  
  useGameStore.getState().initializeBoard(board, animals, biomes, updatedPlayers);
  // Immediately seed the board with initial resources so the first turn is fully populated
  resetResources();
}

/**
 * Get the current board state
 */
export function getBoard(): Board | null {
  return useGameStore.getState().board;
}

/**
 * Get a tile at specific coordinates
 */
export function getTile(x: number, y: number): Tile | undefined {
  const state = useGameStore.getState();
  return BoardController.getTile(x, y, state.board);
}

/**
 * Get the function to advance to the next turn
 */
export function getNextTurn(): () => void {
  return useGameStore.getState().nextTurn;
}