import Game from "./components/Game";
import State from "./components/State";
import { useGameStore } from "./store/gameStore";
import { useEffect, useState } from "react";
import { MapGenerationType } from "./store/gameStore";
import { Routes, Route } from "react-router-dom";
import { GameInitializer } from "./services/gameInitializer";

function App() {
  const turn = useGameStore((state) => state.turn);
  const nextTurn = useGameStore((state) => state.nextTurn);
  const addPotentialHabitat = useGameStore((state) => state.addPotentialHabitat);
  const habitats = useGameStore((state) => state.habitats);
  const isInitialized = useGameStore((state) => state.isInitialized);
  
  // Track map size
  const [mapWidth, setMapWidth] = useState(30);
  const [mapHeight, setMapHeight] = useState(30);
  
  return (
    <Routes>
      <Route path="/state" element={
        <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
          <State />
        </div>
      } />
      
      <Route path="/" element={
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
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '300px'
          }}>
            <div>Turn: {turn}</div>
            
            <div style={{ marginTop: '10px' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>Map Generation</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ marginRight: '10px', minWidth: '80px' }}>Width:</label>
                <input 
                  type="range" 
                  min="10" 
                  max="40" 
                  value={mapWidth} 
                  onChange={(e) => setMapWidth(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ marginLeft: '10px', minWidth: '30px' }}>{mapWidth}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ marginRight: '10px', minWidth: '80px' }}>Height:</label>
                <input 
                  type="range" 
                  min="10" 
                  max="40" 
                  value={mapHeight} 
                  onChange={(e) => setMapHeight(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ marginLeft: '10px', minWidth: '30px' }}>{mapHeight}</span>
              </div>
              
              <button
                onClick={() => {
                  GameInitializer.initializeBoard({
                    width: mapWidth,
                    height: mapHeight,
                    mapType: MapGenerationType.ISLAND,
                    forceHabitatGeneration: true
                  });
                }}
                style={{
                  padding: '8px 16px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '10px'
                }}
              >
                Generate New Map
              </button>
              
              <button 
                onClick={nextTurn}
                style={{
                  padding: '8px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  width: '100%'
                }}
              >
                Next Turn
              </button>
              
              <button
                onClick={() => {
                  // Available animal types
                  const animalTypes = ["buffalo", "bunny", "snake", "fish"];
                  // Pick a random animal type
                  const randomType = animalTypes[Math.floor(Math.random() * animalTypes.length)];
                  
                  // Pick a random position on the map
                  const randomX = Math.floor(Math.random() * mapWidth);
                  const randomY = Math.floor(Math.random() * mapHeight);
                  
                  console.log(`Adding random ${randomType} at (${randomX}, ${randomY})`);
                  useGameStore.getState().addAnimal(randomX, randomY, randomType);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Add Random Animal
              </button>
            </div>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;