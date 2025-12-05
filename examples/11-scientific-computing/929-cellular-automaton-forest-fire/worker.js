// Forest Fire CA Worker

const EMPTY = 0;
const TREE = 1;
const FIRE = 2;

// Colors (ABGR)
const COL_EMPTY = 0xFF212121; // Dark grey
const COL_TREE = 0xFF327D2E;  // Green
const COL_FIRE = 0xFF1535D8;  // Orange/Red

let grid, nextGrid;
let displayBuffer;
let width, height;
let probGrow = 0.01;
let probBurn = 0.0001; // Lightning
let isRunning = false;
let tick = 0;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        width = e.data.width;
        height = e.data.height;
        probGrow = e.data.probGrow;
        probBurn = e.data.probBurn;
        
        const len = width * height;
        grid = new Uint8Array(len);
        nextGrid = new Uint8Array(len);
        displayBuffer = new Uint32Array(len);
        
        // Init
        for(let i=0; i<len; i++) {
            if (Math.random() < e.data.probTree) {
                grid[i] = TREE;
                displayBuffer[i] = COL_TREE;
            } else {
                grid[i] = EMPTY;
                displayBuffer[i] = COL_EMPTY;
            }
        }
        
        isRunning = true;
        loop();
    }
    else if (command === 'pause') isRunning = false;
    else if (command === 'resume') { isRunning = true; loop(); }
    else if (command === 'params') {
        probGrow = e.data.probGrow;
        probBurn = e.data.probBurn;
    }
    else if (command === 'ignite') {
        const idx = e.data.y * width + e.data.x;
        if (grid[idx] === TREE) grid[idx] = FIRE;
    }
    else if (command === 'next') {
        displayBuffer = new Uint32Array(e.data.buffer);
        loop();
    }
};

function loop() {
    if (!isRunning) return;

    let trees = 0;
    let fires = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const state = grid[idx];
            
            if (state === FIRE) {
                // Fire -> Empty
                nextGrid[idx] = EMPTY;
                displayBuffer[idx] = COL_EMPTY;
            } else if (state === EMPTY) {
                // Empty -> Tree (Growth)
                if (Math.random() < probGrow) {
                    nextGrid[idx] = TREE;
                    displayBuffer[idx] = COL_TREE;
                    trees++;
                } else {
                    nextGrid[idx] = EMPTY;
                    displayBuffer[idx] = COL_EMPTY;
                }
            } else { // TREE
                // Tree -> Fire (if neighbor burning or lightning)
                let catchFire = false;
                
                // Check Neighbors (Moore neighborhood? Von Neumann usually sufficient for fire)
                // Let's check 4 neighbors
                // Up
                if (y > 0 && grid[idx - width] === FIRE) catchFire = true;
                // Down
                else if (y < height - 1 && grid[idx + width] === FIRE) catchFire = true;
                // Left
                else if (x > 0 && grid[idx - 1] === FIRE) catchFire = true;
                // Right
                else if (x < width - 1 && grid[idx + 1] === FIRE) catchFire = true;
                
                if (catchFire || Math.random() < probBurn) {
                    nextGrid[idx] = FIRE;
                    displayBuffer[idx] = COL_FIRE;
                    fires++;
                } else {
                    nextGrid[idx] = TREE;
                    displayBuffer[idx] = COL_TREE;
                    trees++;
                }
            }
        }
    }
    
    // Swap
    const temp = grid;
    grid = nextGrid;
    nextGrid = temp;
    
    tick++;

    self.postMessage({
        type: 'frame',
        data: {
            buffer: displayBuffer.buffer,
            trees, fires, tick
        }
    }, [displayBuffer.buffer]);
}
