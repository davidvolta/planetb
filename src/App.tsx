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
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Game canvas takes the full screen */}
      <Game />
      
      {/* UI elements overlay on top */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 10,
        background: 'rgba(0,0,0,0.5)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white'
      }}>
        <button 
          onClick={nextTurn}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Next Turn
        </button>
        <span>Current Turn: {turn}</span>
      </div>
    </div>
  );
}

export default App;