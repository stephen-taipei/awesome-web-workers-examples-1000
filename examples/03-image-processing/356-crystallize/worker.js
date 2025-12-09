// Web Worker 代碼
self.onmessage = function(e) {
    const { imageData, cellSize } = e.data;
    const startTime = performance.now();

    try {
        const resultImageData = crystallize(imageData, cellSize);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: resultImageData,
            duration: endTime - startTime
        });
    } catch (error) {
        console.error(error);
        self.postMessage({ type: 'error', error: error.message });
    }
};

function crystallize(imageData, cellSize) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(data.length);

    // Generate random feature points
    // To ensure somewhat uniform distribution but still random (like Voronoi),
    // we can use a grid and perturb points, or just random points.
    // For a "crystallize" effect, we often want the cells to be roughly uniform size.
    // Let's generate approximately (width*height)/(cellSize*cellSize) points.

    const numPoints = Math.floor((width * height) / (cellSize * cellSize));
    const points = [];

    for (let i = 0; i < numPoints; i++) {
        points.push({
            x: Math.floor(Math.random() * width),
            y: Math.floor(Math.random() * height),
            color: null
        });
    }

    // Sample colors for each point
    for (let i = 0; i < numPoints; i++) {
        const p = points[i];
        const idx = (p.y * width + p.x) * 4;
        p.color = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
    }

    // For each pixel, find nearest point.
    // Optimization: Brute force is O(W*H*N), which is too slow.
    // N could be thousands. 1920*1080 * 2000 ~= 4*10^9 ops.
    // We need a faster way.
    // A simple grid optimization (spatial hashing) or Jump Flooding Algorithm (JFA).
    // Or just check points in nearby cells if we generated them using a grid.

    // Let's try the grid generation approach + perturbation which allows checking only neighbors.
    // Divide image into grid of size ~ cellSize.
    // In each grid cell, place 1 random point.
    // Then for a pixel in a grid cell, we only need to check the point in that cell and 8 neighbors.

    // Re-generate points using grid approach for performance
    const gridW = Math.ceil(width / cellSize);
    const gridH = Math.ceil(height / cellSize);
    const gridPoints = new Array(gridH * gridW);

    // Generate 1 point per cell
    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            // Random position within the cell
            const cellX = gx * cellSize;
            const cellY = gy * cellSize;

            // Random offset within cell
            const offX = Math.floor(Math.random() * cellSize);
            const offY = Math.floor(Math.random() * cellSize);

            let px = cellX + offX;
            let py = cellY + offY;

            // Clamp to image bounds
            px = Math.min(px, width - 1);
            py = Math.min(py, height - 1);

            const idx = (py * width + px) * 4;
            const color = [data[idx], data[idx+1], data[idx+2], data[idx+3]];

            gridPoints[gy * gridW + gx] = { x: px, y: py, color: color };
        }
    }

    // Now iterate over all pixels
    for (let y = 0; y < height; y++) {
        // Report progress
        if (y % 50 === 0) {
            self.postMessage({ type: 'progress', progress: y / height });
        }

        for (let x = 0; x < width; x++) {
            const gx = Math.floor(x / cellSize);
            const gy = Math.floor(y / cellSize);

            let minDist = Infinity;
            let nearestPoint = null;

            // Check 3x3 neighbors
            for (let ny = gy - 1; ny <= gy + 1; ny++) {
                for (let nx = gx - 1; nx <= gx + 1; nx++) {
                    if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
                        const p = gridPoints[ny * gridW + nx];
                        const dist = (x - p.x) ** 2 + (y - p.y) ** 2; // Squared distance
                        if (dist < minDist) {
                            minDist = dist;
                            nearestPoint = p;
                        }
                    }
                }
            }

            const idx = (y * width + x) * 4;
            if (nearestPoint) {
                result[idx] = nearestPoint.color[0];
                result[idx+1] = nearestPoint.color[1];
                result[idx+2] = nearestPoint.color[2];
                result[idx+3] = nearestPoint.color[3]; // Keep original alpha? Or use point alpha? Usually 255.
            } else {
                // Fallback (should not happen)
                result[idx] = data[idx];
                result[idx+1] = data[idx+1];
                result[idx+2] = data[idx+2];
                result[idx+3] = data[idx+3];
            }
        }
    }

    return new ImageData(result, width, height);
}
