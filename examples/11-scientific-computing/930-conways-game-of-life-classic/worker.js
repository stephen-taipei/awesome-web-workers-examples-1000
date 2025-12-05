// Game of Life Worker

let grid; // Uint8Array (0 or 1)
let nextGrid;
let displayBuffer; // Uint32Array (for RGBA manipulation)
let size;
let speed = 30;
let isRunning = false;
let generation = 0;

// Colors (ABGR)
const COLOR_ALIVE = 0xFF00D7FF; // Gold
const COLOR_DEAD = 0xFF000000;  // Black

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        size = e.data.size;
        speed = e.data.speed;
        const density = e.data.density;
        
        const len = size * size;
        grid = new Uint8Array(len);
        nextGrid = new Uint8Array(len);
        displayBuffer = new Uint32Array(len);
        
        // Randomize
        for(let i=0; i<len; i++) {
            grid[i] = Math.random() < density ? 1 : 0;
        }
        
        generation = 0;
        isRunning = true;
        loop();
    }
    else if (command === 'pause') isRunning = false;
    else if (command === 'resume') { isRunning = true; loop(); }
    else if (command === 'params') speed = e.data.speed;
    else if (command === 'draw') {
        if (grid) {
            const idx = e.data.y * size + e.data.x;
            if (idx >= 0 && idx < grid.length) grid[idx] = 1;
        }
    }
    else if (command === 'next') {
        // Recover buffer
        displayBuffer = new Uint32Array(e.data.buffer);
        loop();
    }
};

function loop() {
    if (!isRunning) return;

    const start = performance.now();
    let population = 0;

    // Simulation Step
    for (let y = 0; y < size; y++) {
        // Optimization: Pre-calc row indices
        const rowOffset = y * size;
        const topOffset = (y === 0 ? size - 1 : y - 1) * size;
        const botOffset = (y === size - 1 ? 0 : y + 1) * size;
        
        for (let x = 0; x < size; x++) {
            const idx = rowOffset + x;
            const cell = grid[idx];
            
            // Neighbors (Periodic BC)
            const left = x === 0 ? size - 1 : x - 1;
            const right = x === size - 1 ? 0 : x + 1;
            
            // Sum
            const neighbors = 
                grid[topOffset + left] + grid[topOffset + x] + grid[topOffset + right] +
                grid[rowOffset + left] +                       grid[rowOffset + right] +
                grid[botOffset + left] + grid[botOffset + x] + grid[botOffset + right];
            
            // Rules
            if (cell === 1) {
                if (neighbors === 2 || neighbors === 3) {
                    nextGrid[idx] = 1;
                    population++;
                    displayBuffer[idx] = COLOR_ALIVE;
                } else {
                    nextGrid[idx] = 0;
                    displayBuffer[idx] = COLOR_DEAD;
                }
            } else {
                if (neighbors === 3) {
                    nextGrid[idx] = 1;
                    population++;
                    displayBuffer[idx] = COLOR_ALIVE;
                } else {
                    nextGrid[idx] = 0;
                    displayBuffer[idx] = COLOR_DEAD;
                }
            }
        }
    }
    
    // Swap
    const temp = grid;
    grid = nextGrid;
    nextGrid = temp;
    
    generation++;

    self.postMessage({
        type: 'frame',
        data: {
            buffer: displayBuffer.buffer,
            generation,
            population,
            size
        }
    }, [displayBuffer.buffer]);
    
    // Throttle speed
    // If speed is max (60), no delay.
    // Otherwise wait.
    if (speed < 60) {
        // Not actually waiting here because we rely on 'next' message for loop
        // We can implement delay in main thread or here?
        // Let's do a busy wait or just skip frames?
        // Actually, 'loop' is called by 'next' message.
        // We can't delay the 'next' message easily from here without setTimeout.
        // But `postMessage` is async.
        // The delay should be controlled by how fast we send 'next'.
        // Currently main thread sends 'next' immediately.
    }
}
