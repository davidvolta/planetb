import Game from "./components/Game";
import { useGameStore } from "./store/gameStore";

function App() {
  const turn = useGameStore((state) => state.turn);
  const nextTurn = useGameStore((state) => state.nextTurn);

  return (
    <div>
      <h1>4X Strategy Game</h1>
      <button onClick={nextTurn}>Next Turn</button>
      <p>Current Turn: {turn}</p>
      <Game />
    </div>
  );
}

export default App;