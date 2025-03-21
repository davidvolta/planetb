import Game from "./components/Game";
import { useGameStore } from "./store/gameStore";
import { useEffect } from "react";

function App() {
  const turn = useGameStore((state) => state.turn);
  const nextTurn = useGameStore((state) => state.nextTurn);
  const initializeBoard = useGameStore((state) => state.initializeBoard);
  
  // Initialize the board when the app loads
  useEffect(() => {
    // Initialize a 10x10 board
    initializeBoard(10, 10);
    console.log("Board initialized");
  }, [initializeBoard]);

  return (
    <div>
      <button onClick={nextTurn}>Next Turn</button>
      <p>Current Turn: {turn}</p>
      <Game />
    </div>
  );
}

export default App;