// Marching Squares Worker

self.onmessage = function(e) {
    const { command, eqZ, range, resolution, levels } = e.data;

    if (command === 'compute') {
        try {
            const start = performance.now();

            const funcZ = createMathFunction(eqZ);
            
            // 1. Generate Scalar Field
            const grid = new Float32Array((resolution + 1) * (resolution + 1));
            const step = (range * 2) / resolution;
            
            let minZ = Infinity, maxZ = -Infinity;

            for (let r = 0; r <= resolution; r++) {
                // Y from bottom (-range) to top (+range)
                // But canvas Y is top-down.
                // Let's map grid[r][c] -> y: range - r*step (top down)
                // Actually mathematical standard: y goes up.
                // We'll generate mathematical coords, normalize later.
                const y = range - r * step; 
                
                for (let c = 0; c <= resolution; c++) {
                    const x = -range + c * step;
                    const z = funcZ(x, y);
                    
                    grid[r * (resolution + 1) + c] = z;
                    
                    if (z < minZ) minZ = z;
                    if (z > maxZ) maxZ = z;
                }
            }

            // 2. Determine Iso-levels
            const zLevels = [];
            const zStep = (maxZ - minZ) / (levels + 1);
            for (let i = 1; i <= levels; i++) {
                zLevels.push(minZ + i * zStep);
            }

            // 3. Marching Squares
            const contours = []; // Array of { level, lines: [[[x1,y1], [x2,y2]], ...] }
            const width = resolution + 1;

            for (let level of zLevels) {
                const lines = [];
                
                for (let r = 0; r < resolution; r++) {
                    for (let c = 0; c < resolution; c++) {
                        // Get 4 corners indices
                        const bl = (r + 1) * width + c;     // Bottom-Left (in grid index, assuming row 0 is top)
                        const br = (r + 1) * width + (c+1); // Bottom-Right
                        const tr = r * width + (c+1);       // Top-Right
                        const tl = r * width + c;           // Top-Left
                        
                        // Note on Grid: r=0 is top row (y=+range). r=res is bottom row (y=-range).
                        // Cell (c, r) has corners:
                        // TL: (c, r)
                        // TR: (c+1, r)
                        // BR: (c+1, r+1)
                        // BL: (c, r+1)
                        
                        const valTL = grid[tl];
                        const valTR = grid[tr];
                        const valBR = grid[br];
                        const valBL = grid[bl];
                        
                        // Calculate config index (binary)
                        let caseId = 0;
                        if (valBL >= level) caseId |= 1;
                        if (valBR >= level) caseId |= 2;
                        if (valTR >= level) caseId |= 4;
                        if (valTL >= level) caseId |= 8;
                        
                        if (caseId === 0 || caseId === 15) continue; // Fully inside or outside
                        
                        // Line interpolation factors (where on the edge is the crossing?)
                        // TL(0,0) -- Top Edge -- TR(1,0)
                        // |                        |
                        // Left Edge             Right Edge
                        // |                        |
                        // BL(0,1) -- Bot Edge -- BR(1,1)
                        
                        // Coordinates are relative to cell origin (c, r)
                        // Normalized to 0..1 within cell
                        
                        const topX = (level - valTL) / (valTR - valTL); // y=0
                        const botX = (level - valBL) / (valBR - valBL); // y=1
                        const leftY = (level - valTL) / (valBL - valTL); // x=0
                        const rightY = (level - valTR) / (valBR - valTR); // x=1
                        
                        // Helper to add line segment
                        const addSeg = (p1, p2) => {
                            // Map cell coords to normalized grid coords (0..1)
                            // x = (c + localX) / resolution
                            // y = (r + localY) / resolution
                            lines.push([
                                [(c + p1[0]) / resolution, (r + p1[1]) / resolution],
                                [(c + p2[0]) / resolution, (r + p2[1]) / resolution]
                            ]);
                        };

                        // Marching Squares Lookup Table Cases
                        switch (caseId) {
                            case 1:  addSeg([0, leftY], [botX, 1]); break;
                            case 2:  addSeg([botX, 1], [1, rightY]); break;
                            case 3:  addSeg([0, leftY], [1, rightY]); break;
                            case 4:  addSeg([topX, 0], [1, rightY]); break;
                            case 5:  addSeg([0, leftY], [topX, 0]); addSeg([botX, 1], [1, rightY]); break; // Saddle
                            case 6:  addSeg([topX, 0], [botX, 1]); break;
                            case 7:  addSeg([0, leftY], [topX, 0]); break;
                            case 8:  addSeg([0, leftY], [topX, 0]); break;
                            case 9:  addSeg([topX, 0], [botX, 1]); break;
                            case 10: addSeg([0, leftY], [botX, 1]); addSeg([topX, 0], [1, rightY]); break; // Saddle
                            case 11: addSeg([topX, 0], [1, rightY]); break;
                            case 12: addSeg([0, leftY], [1, rightY]); break;
                            case 13: addSeg([botX, 1], [1, rightY]); break;
                            case 14: addSeg([0, leftY], [botX, 1]); break;
                        }
                    }
                }
                contours.push({ level, lines });
            }

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    contours,
                    minZ, maxZ,
                    duration: (end - start).toFixed(2)
                }
            });

        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};

function createMathFunction(expression) {
    const args = ['x', 'y'];
    const body = `with (Math) { return (${expression}); }`;
    return new Function(...args, body);
}
