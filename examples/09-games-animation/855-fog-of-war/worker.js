/**
 * Fog of War - Web Worker
 */
let width = 800, height = 600, gridSize = 20;
let explored = null, currentVision = null;
let cols, rows;

self.onmessage = function(e) {
    const { type, payload } = e.data;
    switch (type) {
        case 'START':
            width = payload.width;
            height = payload.height;
            gridSize = payload.gridSize;
            cols = Math.ceil(width / gridSize);
            rows = Math.ceil(height / gridSize);
            explored = new Uint8Array(cols * rows);
            currentVision = new Uint8Array(cols * rows);
            break;
        case 'UPDATE':
            updateFog(payload.unit);
            break;
        case 'RESET':
            explored = new Uint8Array(cols * rows);
            break;
    }
};

function updateFog(unit) {
    currentVision.fill(0);
    const unitCol = Math.floor(unit.x / gridSize);
    const unitRow = Math.floor(unit.y / gridSize);
    const radius = Math.ceil(unit.visionRadius / gridSize);

    for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
            const r = unitRow + dr;
            const c = unitCol + dc;
            if (r >= 0 && r < rows && c >= 0 && c < cols) {
                const dist = Math.sqrt(dr*dr + dc*dc);
                if (dist <= radius) {
                    const idx = r * cols + c;
                    currentVision[idx] = 1;
                    explored[idx] = 1;
                }
            }
        }
    }

    self.postMessage({
        type: 'FOG',
        payload: {
            currentVision: Array.from(currentVision),
            explored: Array.from(explored)
        }
    });
}
