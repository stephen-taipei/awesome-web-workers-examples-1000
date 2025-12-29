/**
 * Procedural City - Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'GENERATE') {
        const startTime = performance.now();
        const city = generateCity(payload.gridSize, payload.density);
        const endTime = performance.now();

        self.postMessage({
            type: 'COMPLETE',
            payload: {
                ...city,
                time: endTime - startTime
            }
        });
    }
};

function generateCity(gridSize, density) {
    const buildings = [];
    const parks = [];
    const roads = [];
    const occupied = new Set();

    // Generate roads every few blocks
    const roadInterval = 4;
    for (let i = roadInterval; i < gridSize; i += roadInterval) {
        roads.push({ x: i, horizontal: false });
        roads.push({ y: i, horizontal: true });
    }

    // Generate buildings and parks
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            // Skip if on road
            const onRoad = roads.some(r =>
                (r.horizontal && Math.abs(r.y - y) < 0.5) ||
                (!r.horizontal && Math.abs(r.x - x) < 0.5)
            );
            if (onRoad) continue;

            const key = `${x},${y}`;
            if (occupied.has(key)) continue;

            if (Math.random() < density) {
                // Building
                const width = Math.random() > 0.7 ? Math.min(2, gridSize - x) : 1;
                const depth = Math.random() > 0.7 ? Math.min(2, gridSize - y) : 1;
                const height = 1 + Math.floor(Math.random() * 10);

                // Mark occupied cells
                for (let dy = 0; dy < depth; dy++) {
                    for (let dx = 0; dx < width; dx++) {
                        occupied.add(`${x + dx},${y + dy}`);
                    }
                }

                buildings.push({
                    x, y,
                    width, depth, height,
                    type: getRandomBuildingType()
                });
            } else if (Math.random() < 0.2) {
                // Park
                parks.push({ x, y });
                occupied.add(key);
            }
        }
    }

    return {
        gridSize,
        buildings,
        parks,
        roads,
        buildingCount: buildings.length,
        roadCount: roads.length
    };
}

function getRandomBuildingType() {
    const types = ['residential', 'commercial', 'office', 'industrial'];
    return types[Math.floor(Math.random() * types.length)];
}
