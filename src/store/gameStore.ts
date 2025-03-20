import { create } from "zustand";

interface GameState {
  turn: number;
  nextTurn: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  turn: 1,
  nextTurn: () => set((state) => ({ turn: state.turn + 1 })),
}));
