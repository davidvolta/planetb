import React, { useState } from 'react';
import Game from "./components/Game";
import State from "./components/State";
import { useGameStore, MapGenerationType } from "./store/gameStore";
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import * as actions from './store/actions';

function App() {
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
            top: 20, 
            right: 20, 
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
            {/* Map size controls */}
            <div>
              <div>Width: {mapWidth}</div>
              <input 
                type="range" 
                min="10" 
                max="50" 
                value={mapWidth} 
                onChange={handleWidthChange}
                style={{ width: '100%' }}
              />
              
              <div>Height: {mapHeight}</div>
              <input 
                type="range" 
                min="10" 
                max="50" 
                value={mapHeight} 
                onChange={handleHeightChange}
                style={{ width: '100%' }}
              />
              
              {/* Hidden Reset Map button - uncomment if needed
              <button
                onClick={() => actions.initializeBoard({
                  width: mapWidth,
                  height: mapHeight,
                  mapType: MapGenerationType.ISLAND,
                  forceHabitatGeneration: true
                })}
                style={{
                  marginTop: '5px',
                  background: '#e24a4a',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Reset Map
              </button>
              */}
            </div>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;