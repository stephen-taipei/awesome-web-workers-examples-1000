// Region Growing Worker

self.onmessage = function(e) {
    const { imageData, seed, threshold } = e.data;
    const { width, height, data } = imageData;

    try {
        const startTime = performance.now();

        self.postMessage({ type: 'progress', progress: 10, message: '初始化...' });

        // Output mask: 1 for included, 0 for not
        const mask = new Uint8Array(width * height);
        const visited = new Uint8Array(width * height);

        // Stack for DFS/BFS (using array as stack)
        const stack = [];

        const seedIdx = seed.y * width + seed.x;

        // Get seed color (RGB)
        const seedR = data[seedIdx * 4];
        const seedG = data[seedIdx * 4 + 1];
        const seedB = data[seedIdx * 4 + 2];

        // Push seed
        stack.push(seedIdx);
        visited[seedIdx] = 1;
        mask[seedIdx] = 1;

        let pixelCount = 0;
        let processedCount = 0;
        const totalPixels = width * height;

        // Simple Color Distance Function
        // Euclidean distance in RGB space
        const thresholdSq = threshold * threshold * 3; // Normalize roughly
        // Or simple Manhattan: |r1-r2| + |g1-g2| + |b1-b2| <= threshold * 3

        // Let's use Euclidean distance squared compared to threshold^2
        // Since threshold is 0-100 (perc), let's map it to 0-441 (sqrt(255^2*3))
        // Actually the slider is 1-100. Let's treat it as max difference per channel average?
        // Let's stick to simple Euclidean distance.
        const distThreshold = threshold * 4.4; // 100 -> ~440
        const distThresholdSq = distThreshold * distThreshold;

        const checkNeighbor = (idx) => {
            if (idx < 0 || idx >= totalPixels || visited[idx]) return;

            const r = data[idx * 4];
            const g = data[idx * 4 + 1];
            const b = data[idx * 4 + 2];

            const dr = r - seedR;
            const dg = g - seedG;
            const db = b - seedB;

            const distSq = dr*dr + dg*dg + db*db;

            if (distSq <= distThresholdSq) {
                visited[idx] = 1;
                mask[idx] = 1;
                stack.push(idx);
                pixelCount++;
            } else {
                // Mark as visited but not part of region so we don't check again
                visited[idx] = 1;
            }
        };

        self.postMessage({ type: 'progress', progress: 20, message: '生長區域...' });

        // Max iterations just in case, though visited array prevents loops
        while (stack.length > 0) {
            const currentIdx = stack.pop();
            const cx = currentIdx % width;
            const cy = Math.floor(currentIdx / width);

            // 4-connectivity
            // Check Right
            if (cx < width - 1) checkNeighbor(currentIdx + 1);
            // Check Left
            if (cx > 0) checkNeighbor(currentIdx - 1);
            // Check Down
            if (cy < height - 1) checkNeighbor(currentIdx + width);
            // Check Up
            if (cy > 0) checkNeighbor(currentIdx - width);

            processedCount++;

            if (processedCount % 50000 === 0) {
                 // Estimate progress not accurate but gives feedback
                 self.postMessage({ type: 'progress', progress: 20 + Math.min(60, (processedCount / 200000) * 100), message: '生長中...' });
            }
        }

        self.postMessage({ type: 'progress', progress: 90, message: '完成...' });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                mask: mask,
                pixelCount: pixelCount
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};
