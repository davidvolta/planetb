import React, { useState } from 'react';
import Game from "./components/Game";
import State from "./components/State";
import { useGameStore, MapGenerationType } from "./store/gameStore";
import { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import * as actions from './store/actions';

function App() {
  // Use direct Zustand hooks for state reading
  const turn = useGameStore((state) => state.turn);
  const nextTurn = useGameStore((state) => state.nextTurn);
  const habitats = useGameStore((state) => state.habitats);
  const isInitialized = useGameStore((state) => state.isInitialized);
  
  // Track map size
  const [mapWidth, setMapWidth] = useState(30);
  const [mapHeight, setMapHeight] = useState(30);
  
  // Handle width slider change with immediate map update
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    setMapWidth(newWidth);
    // Immediately update the map
    actions.initializeBoard({
      width: newWidth,
      height: mapHeight,
      mapType: MapGenerationType.ISLAND,
      forceHabitatGeneration: true
    });
  };
  
  // Handle height slider change with immediate map update
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value);
    setMapHeight(newHeight);
    // Immediately update the map
    actions.initializeBoard({
      width: mapWidth,
      height: newHeight,
      mapType: MapGenerationType.ISLAND,
      forceHabitatGeneration: true
    });
  };
  
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
                  onChange={handleWidthChange}
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
                  onChange={handleHeightChange}
                  style={{ flex: 1 }}
                />
                <span style={{ marginLeft: '10px', minWidth: '30px' }}>{mapHeight}</span>
              </div>
              
              <button
                onClick={() => {
                  console.log(`Manually generating new map: ${mapWidth}x${mapHeight}`);
                  actions.initializeBoard({
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
            </div>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;