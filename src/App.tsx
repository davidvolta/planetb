import Game from "./components/Game";
import State from "./components/State";
import { useGameStore } from "./store/gameStore";
import { useEffect, useState } from "react";
import { MapGenerationType } from "./store/gameStore";
import { Routes, Route, Link } from "react-router-dom";
import { GameInitializer } from "./services/gameInitializer";

function App() {
  const turn = useGameStore((state) => state.turn);
  const nextTurn = useGameStore((state) => state.nextTurn);
  
  // Track map size
  const [mapWidth, setMapWidth] = useState(30);
  const [mapHeight, setMapHeight] = useState(30);
  
  // Track tile size
  const [tileSize, setTileSize] = useState(64);
  
  // Single initialization and update effect
  useEffect(() => {
    GameInitializer.initializeBoard({
      width: mapWidth,
      height: mapHeight,
      mapType: MapGenerationType.ISLAND
    });
  }, [mapWidth, mapHeight]);

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
          <Game tileSize={tileSize} />
          
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
            <div>
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
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ marginRight: '10px', minWidth: '80px' }}>Tile Size:</label>
                <input 
                  type="range" 
                  min="32" 
                  max="160" 
                  step="8"
                  value={tileSize} 
                  onChange={(e) => setTileSize(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ marginLeft: '10px', minWidth: '30px' }}>{tileSize}</span>
              </div>
              
              <button
                onClick={() => {
                  GameInitializer.initializeBoard({
                    width: mapWidth,
                    height: mapHeight,
                    mapType: MapGenerationType.ISLAND
                  });
                }}
                style={{
                  padding: '8px 16px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Generate New Map
              </button>
              
              <button
                onClick={() => {
                  const centerX = Math.floor(mapWidth / 2);
                  const centerY = Math.floor(mapHeight / 2);
                  console.log(`Adding test animal at (${centerX}, ${centerY})`);
                  useGameStore.getState().addAnimal(centerX, centerY, "buffalo");
                }}
                style={{
                  padding: '8px 16px',
                  background: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '10px'
                }}
              >
                Add Test Buffalo
              </button>
              
              <button
                onClick={() => {
                  const centerX = Math.floor(mapWidth / 2) - 3;
                  const centerY = Math.floor(mapHeight / 2) - 3;
                  console.log(`Adding test eagle at (${centerX}, ${centerY})`);
                  useGameStore.getState().addAnimal(centerX, centerY, "eagle");
                }}
                style={{
                  padding: '8px 16px',
                  background: '#FFC107',
                  color: 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '10px'
                }}
              >
                Add Test Eagle
              </button>
            </div>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;