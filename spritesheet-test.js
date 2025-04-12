// Spritesheet Animation Test
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas and context
    const canvas = document.getElementById('animation-canvas');
    const ctx = canvas.getContext('2d');
    
    // Animation settings
    let frameWidth = 320;   // Each frame is 320px as specified
    let frameHeight = 320;  // Each frame is 320px as specified
    let currentFrame = 0;   // Current animation frame
    let animationSpeed = 100; // Animation speed in milliseconds
    let isPlaying = true;   // Animation state
    let animationInterval;  // Reference to interval timer
    
    // Spritesheet structure - 3x3 grid
    const spritesheetRows = 3;
    const spritesheetCols = 3;
    const totalFrames = spritesheetRows * spritesheetCols;
    
    // Display info about the current animation
    const updateInfo = () => {
        const info = document.getElementById('animation-info');
        if (info) {
            info.textContent = `Frame: ${currentFrame+1}/${totalFrames} | Speed: ${animationSpeed}ms`;
        }
    };
    
    // Load the spritesheet
    const spritesheet = new Image();
    spritesheet.src = '/assets/spritesheet.png';
    
    // Wait for the spritesheet to load
    spritesheet.onload = function() {
        console.log('Spritesheet loaded!');
        console.log(`Dimensions: ${spritesheet.width}x${spritesheet.height}`);
        
        console.log(`Frame size: ${frameWidth}x${frameHeight}`);
        console.log(`Grid: ${spritesheetRows}x${spritesheetCols}`);
        console.log(`Total frames: ${totalFrames}`);
        
        // Resize canvas to fit the frame size
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        
        // Create animation controls
        createControls();
        
        // Start the animation
        startAnimation();
        updateInfo();
    };
    
    // Error handling for image loading
    spritesheet.onerror = function() {
        console.error('Error loading spritesheet!');
        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        ctx.fillText('Error loading spritesheet!', 20, 30);
        ctx.fillText('Path: ' + spritesheet.src, 20, 50);
        ctx.fillText('Check console for details', 20, 70);
    };
    
    // Create animation controls and info display
    function createControls() {
        // Create info display
        const container = document.createElement('div');
        container.style.marginTop = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.gap = '10px';
        
        const info = document.createElement('div');
        info.id = 'animation-info';
        info.style.fontFamily = 'monospace';
        container.appendChild(info);
        
        // Add frame scrubber slider
        const sliderContainer = document.createElement('div');
        sliderContainer.style.width = '100%';
        sliderContainer.style.maxWidth = '600px';
        sliderContainer.style.margin = '10px 0';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = (totalFrames - 1).toString();
        slider.value = '0';
        slider.style.width = '100%';
        slider.id = 'frame-slider';
        
        slider.addEventListener('input', (e) => {
            currentFrame = parseInt(e.target.value);
            if (!isPlaying) {
                drawFrame();
            }
            updateInfo();
        });
        
        sliderContainer.appendChild(slider);
        container.appendChild(sliderContainer);
        
        // Add to page after canvas container
        document.getElementById('canvas-container').after(container);
    }
    
    // Draw the current frame
    function drawFrame() {
        // Calculate position in spritesheet based on frame number
        const col = currentFrame % spritesheetCols;
        const row = Math.floor(currentFrame / spritesheetCols);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw debug grid if enabled
        if (document.getElementById('show-grid')?.checked) {
            drawGrid();
        }
        
        // Draw the current frame
        ctx.drawImage(
            spritesheet,
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );
        
        // Update slider position
        const slider = document.getElementById('frame-slider');
        if (slider) {
            slider.value = currentFrame.toString();
        }
    }
    
    // Animation function
    function animate() {
        drawFrame();
        
        // Update frame counter - treat all frames as one continuous animation
        currentFrame = (currentFrame + 1) % totalFrames;
        
        // Update info display
        updateInfo();
    }
    
    // Draw a debug grid
    function drawGrid() {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        
        // Draw a 4x4 grid
        for (let i = 0; i <= canvas.width; i += canvas.width / 4) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        
        for (let i = 0; i <= canvas.height; i += canvas.height / 4) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
    }
    
    // Start animation
    function startAnimation() {
        if (animationInterval) clearInterval(animationInterval);
        animationInterval = setInterval(animate, animationSpeed);
        isPlaying = true;
    }
    
    // Pause animation
    function pauseAnimation() {
        clearInterval(animationInterval);
        animationInterval = null;
        isPlaying = false;
    }
    
    // Event listeners for controls
    document.getElementById('play-btn').addEventListener('click', () => {
        if (!isPlaying) startAnimation();
    });
    
    document.getElementById('pause-btn').addEventListener('click', () => {
        if (isPlaying) pauseAnimation();
    });
    
    document.getElementById('speed-up-btn').addEventListener('click', () => {
        animationSpeed = Math.max(20, animationSpeed - 20);
        if (isPlaying) {
            pauseAnimation();
            startAnimation();
        }
        updateInfo();
    });
    
    document.getElementById('slow-down-btn').addEventListener('click', () => {
        animationSpeed += 20;
        if (isPlaying) {
            pauseAnimation();
            startAnimation();
        }
        updateInfo();
    });
    
    // Add debugging checkbox
    const controls = document.querySelector('.controls');
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'flex';
    gridContainer.style.alignItems = 'center';
    gridContainer.style.marginLeft = '20px';
    
    const gridCheck = document.createElement('input');
    gridCheck.type = 'checkbox';
    gridCheck.id = 'show-grid';
    
    const gridLabel = document.createElement('label');
    gridLabel.htmlFor = 'show-grid';
    gridLabel.textContent = 'Show Grid';
    gridLabel.style.marginLeft = '5px';
    
    gridContainer.appendChild(gridCheck);
    gridContainer.appendChild(gridLabel);
    controls.appendChild(gridContainer);
}); 