// 3D Game of Life Worker

let grid; // 1D array for 3D grid: index = x + y*size + z*size*size
let nextGrid;
let size;
let ruleS = [4, 5]; // Survival
let ruleB = [5];    // Birth
let speed = 10;
let isRunning = false;
let generation = 0;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        size = e.data.size;
        speed = e.data.speed;
        parseRule(e.data.rule);
        
        const len = size * size * size;
        grid = new Uint8Array(len);
        nextGrid = new Uint8Array(len);
        
        // Randomize
        for(let i=0; i<len; i++) {
            grid[i] = Math.random() > 0.8 ? 1 : 0;
        }
        
        generation = 0;
        isRunning = true;
        loop();
    }
    else if (command === 'pause') {
        isRunning = false;
    }
    else if (command === 'resume') {
        isRunning = true;
        loop();
    }
    else if (command === 'params') {
        speed = e.data.speed;
    }
};

function parseRule(ruleStr) {
    // format 4555 -> S:4,5 B:5,5 (Usually written S45/B55)
    // Demo simple parsing: "4555" -> survive 4,5; birth 5
    // 5766 -> S 5,6,7; B 6
    if (ruleStr === '4555') {
        ruleS = [4, 5];
        ruleB = [5];
    } else {
        ruleS = [5, 6, 7];
        ruleB = [6];
    }
}

function loop() {
    if (!isRunning) return;

    const start = performance.now();
    
    const len = size * size * size;
    const s2 = size * size;
    let population = 0;
    const liveCells = []; // Store coordinates to send back
    
    // Iterate Grid
    // Optimize: Skip borders to avoid bounds checks (treat as dead)
    // Or wrap around. Let's wrap.
    
    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = x + y*size + z*s2;
                const state = grid[idx];
                
                // Count 26 neighbors (3x3x3 cube minus self)
                let neighbors = 0;
                
                for (let dz = -1; dz <= 1; dz++) {
                    let nz = z + dz;
                    if (nz < 0) nz = size - 1; else if (nz >= size) nz = 0;
                    
                    for (let dy = -1; dy <= 1; dy++) {
                        let ny = y + dy;
                        if (ny < 0) ny = size - 1; else if (ny >= size) ny = 0;
                        
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0 && dz === 0) continue;
                            
                            let nx = x + dx;
                            if (nx < 0) nx = size - 1; else if (nx >= size) nx = 0;
                            
                            if (grid[nx + ny*size + nz*s2]) neighbors++;
                        }
                    }
                }
                
                // Apply Rules
                let nextState = 0;
                if (state === 1) {
                    if (ruleS.includes(neighbors)) nextState = 1;
                } else {
                    if (ruleB.includes(neighbors)) nextState = 1;
                }
                
                nextGrid[idx] = nextState;
                
                if (nextState) {
                    population++;
                    liveCells.push(x, y, z);
                }
            }
        }
    }
    
    // Swap
    const temp = grid;
    grid = nextGrid;
    nextGrid = temp;
    
    generation++;
    
    // Send data
    self.postMessage({
        type: 'update',
        data: {
            cells: new Int16Array(liveCells), // Compact coord array
            generation,
            population
        }
    });
    
    const elapsed = performance.now() - start;
    const delay = Math.max(0, (1000 / speed) - elapsed);
    
    setTimeout(loop, delay);
}
