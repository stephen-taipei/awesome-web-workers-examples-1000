/**
 * Terrain Generator - Web Worker
 * Diamond-Square algorithm
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'GENERATE') {
        const startTime = performance.now();
        const heightmap = diamondSquare(payload.size, payload.roughness);
        const endTime = performance.now();

        self.postMessage({
            type: 'COMPLETE',
            payload: {
                heightmap,
                size: payload.size,
                time: endTime - startTime
            }
        });
    }
};

function diamondSquare(size, roughness) {
    const heightmap = new Float32Array(size * size);

    // Initialize corners
    heightmap[0] = Math.random();
    heightmap[size - 1] = Math.random();
    heightmap[(size - 1) * size] = Math.random();
    heightmap[(size - 1) * size + size - 1] = Math.random();

    let stepSize = size - 1;
    let scale = roughness;

    while (stepSize > 1) {
        const halfStep = stepSize / 2;

        // Diamond step
        for (let y = halfStep; y < size - 1; y += stepSize) {
            for (let x = halfStep; x < size - 1; x += stepSize) {
                const avg = (
                    getHeight(heightmap, size, x - halfStep, y - halfStep) +
                    getHeight(heightmap, size, x + halfStep, y - halfStep) +
                    getHeight(heightmap, size, x - halfStep, y + halfStep) +
                    getHeight(heightmap, size, x + halfStep, y + halfStep)
                ) / 4;

                setHeight(heightmap, size, x, y, avg + (Math.random() - 0.5) * scale);
            }
        }

        // Square step
        for (let y = 0; y < size; y += halfStep) {
            for (let x = (y + halfStep) % stepSize; x < size; x += stepSize) {
                let count = 0;
                let sum = 0;

                if (x - halfStep >= 0) { sum += getHeight(heightmap, size, x - halfStep, y); count++; }
                if (x + halfStep < size) { sum += getHeight(heightmap, size, x + halfStep, y); count++; }
                if (y - halfStep >= 0) { sum += getHeight(heightmap, size, x, y - halfStep); count++; }
                if (y + halfStep < size) { sum += getHeight(heightmap, size, x, y + halfStep); count++; }

                setHeight(heightmap, size, x, y, sum / count + (Math.random() - 0.5) * scale);
            }
        }

        stepSize = halfStep;
        scale *= roughness;
    }

    // Normalize to 0-1
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < heightmap.length; i++) {
        min = Math.min(min, heightmap[i]);
        max = Math.max(max, heightmap[i]);
    }

    const range = max - min || 1;
    for (let i = 0; i < heightmap.length; i++) {
        heightmap[i] = (heightmap[i] - min) / range;
    }

    return heightmap;
}

function getHeight(map, size, x, y) {
    x = Math.max(0, Math.min(size - 1, x));
    y = Math.max(0, Math.min(size - 1, y));
    return map[y * size + x];
}

function setHeight(map, size, x, y, value) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
        map[y * size + x] = value;
    }
}
