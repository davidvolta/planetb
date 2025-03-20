import { create } from "zustand";

interface Player {
  id: number;
  name: string;
  color: string;
  isActive: boolean;
}

interface GameState {
  turn: number;
  players: Player[];
  currentPlayerId: number;
  nextTurn: () => void;
  addPlayer: (name: string, color: string) => void;
  setActivePlayer: (playerId: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  turn: 1,
  players: [],
  currentPlayerId: 0,
  nextTurn: () => set((state: GameState) => ({ turn: state.turn + 1 })),
  addPlayer: (name: string, color: string) => 
    set((state: GameState) => {
      const newPlayer: Player = {
        id: state.players.length,
        name,
        color,
        isActive: state.players.length === 0 // First player is active by default
      };
      
      return { players: [...state.players, newPlayer] };
    }),
  setActivePlayer: (playerId: number) =>
    set((state: GameState) => {
      const updatedPlayers = state.players.map(player => ({
        ...player,
        isActive: player.id === playerId
      }));
      
      return { 
        players: updatedPlayers,
        currentPlayerId: playerId
      };
    }),
}));
