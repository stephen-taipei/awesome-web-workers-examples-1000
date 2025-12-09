// DLA Worker

// Use a grid for fast collision detection
let grid;
let width, height;
let batchSize = 200;
let stickiness = 1.0;
let maxRadius = 1; // Start small
let totalCount = 0;

// Optimization: Limit spawn radius to maxRadius + margin
const SPAWN_MARGIN = 20;
const KILL_MARGIN = 40;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        width = e.data.width;
        height = e.data.height;
        batchSize = e.data.batchSize;
        stickiness = e.data.stickiness;
        
        grid = new Uint8Array(width * height);
        
        // Seed center
        const cx = Math.floor(width / 2);
        const cy = Math.floor(height / 2);
        grid[cy * width + cx] = 1;
        totalCount = 1;
        maxRadius = 1;
        
        processBatch();
    }
    else if (command === 'next') {
        processBatch();
    }
    else if (command === 'params') {
        stickiness = e.data.stickiness;
    }
};

function processBatch() {
    const newPoints = [];
    const cx = width / 2;
    const cy = height / 2;
    const spawnR = maxRadius + SPAWN_MARGIN;
    const killR = maxRadius + KILL_MARGIN;
    const killRSq = killR * killR;

    // Simulate N particles sticking
    let stuckCount = 0;
    
    // Safety break
    let loops = 0;
    const maxLoops = batchSize * 5000; // Avoid infinite loop if stuck

    while (stuckCount < batchSize && loops < maxLoops) {
        loops++;
        
        // Spawn particle at random angle on spawn radius
        const angle = Math.random() * 2 * Math.PI;
        let px = Math.floor(cx + Math.cos(angle) * spawnR);
        let py = Math.floor(cy + Math.sin(angle) * spawnR);
        
        // Random Walk
        let walking = true;
        while (walking) {
            // Move
            const dir = Math.floor(Math.random() * 4);
            if (dir === 0) px++;
            else if (dir === 1) px--;
            else if (dir === 2) py++;
            else py--;
            
            // Check Bounds / Kill Radius
            const dx = px - cx;
            const dy = py - cy;
            if (dx*dx + dy*dy > killRSq) {
                walking = false; // Escaped, respawn
                continue;
            }
            
            // Check Neighbors for collision
            if (checkNeighbors(px, py)) {
                if (Math.random() < stickiness) {
                    // Stick
                    grid[py * width + px] = 1;
                    
                    // Update Radius
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > maxRadius) maxRadius = dist;
                    
                    totalCount++;
                    newPoints.push({ x: px, y: py, id: totalCount });
                    stuckCount++;
                    walking = false;
                }
            }
        }
    }

    self.postMessage({
        type: 'batch',
        data: {
            newPoints,
            totalCount,
            maxRadius
        }
    });
}

function checkNeighbors(x, y) {
    // Check 8 neighbors? Or 4.
    // Let's check 8 for better sticking
    if (x <= 0 || x >= width-1 || y <= 0 || y >= height-1) return false;
    
    const idx = y * width + x;
    // Up, Down, Left, Right
    if (grid[idx - width]) return true;
    if (grid[idx + width]) return true;
    if (grid[idx - 1]) return true;
    if (grid[idx + 1]) return true;
    
    // Diagonals
    if (grid[idx - width - 1]) return true;
    if (grid[idx - width + 1]) return true;
    if (grid[idx + width - 1]) return true;
    if (grid[idx + width + 1]) return true;
    
    return false;
}
