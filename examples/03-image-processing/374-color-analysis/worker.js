// worker.js

self.onmessage = function(e) {
    const { imageData, k } = e.data;

    try {
        const startTime = performance.now();
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // Extract pixels
        const pixels = [];
        // Sampling to improve performance for large images, though we resized in main.js
        // If image is still large, we can skip pixels.
        const step = 1;

        for (let i = 0; i < data.length; i += 4 * step) {
            pixels.push({
                r: data[i],
                g: data[i+1],
                b: data[i+2]
            });
        }

        self.postMessage({ type: 'progress', data: 20 });

        // Initialize centroids using K-Means++ logic (simplified: random distinct pixels)
        // Or simply random. Random is easiest.
        let centroids = [];
        for (let i = 0; i < k; i++) {
            const idx = Math.floor(Math.random() * pixels.length);
            centroids.push({ ...pixels[idx] });
        }

        let iterations = 0;
        const maxIterations = 20;
        let changed = true;

        while (changed && iterations < maxIterations) {
            iterations++;

            // Assign pixels to clusters
            const clusters = new Array(k).fill(0).map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

            for (let i = 0; i < pixels.length; i++) {
                const p = pixels[i];
                let minDist = Infinity;
                let clusterIdx = 0;

                for (let j = 0; j < k; j++) {
                    const c = centroids[j];
                    const dist = (p.r - c.r)**2 + (p.g - c.g)**2 + (p.b - c.b)**2;
                    if (dist < minDist) {
                        minDist = dist;
                        clusterIdx = j;
                    }
                }

                clusters[clusterIdx].r += p.r;
                clusters[clusterIdx].g += p.g;
                clusters[clusterIdx].b += p.b;
                clusters[clusterIdx].count++;
            }

            // Recalculate centroids
            let maxShift = 0;

            for (let j = 0; j < k; j++) {
                if (clusters[j].count === 0) {
                    // Re-init empty cluster
                    const idx = Math.floor(Math.random() * pixels.length);
                    centroids[j] = { ...pixels[idx] };
                    continue;
                }

                const newR = clusters[j].r / clusters[j].count;
                const newG = clusters[j].g / clusters[j].count;
                const newB = clusters[j].b / clusters[j].count;

                const shift = (newR - centroids[j].r)**2 + (newG - centroids[j].g)**2 + (newB - centroids[j].b)**2;
                if (shift > maxShift) maxShift = shift;

                centroids[j] = { r: newR, g: newG, b: newB };
            }

            if (maxShift < 1.0) changed = false; // Convergence threshold

            self.postMessage({ type: 'progress', data: 20 + (iterations / maxIterations) * 70 });
        }

        // Final clusters with counts (centroids are the representative colors)
        const resultClusters = centroids.map((c, i) => {
            // Re-count to be accurate (since we might have re-inited empty ones)
            // Or just use the last cluster sums if we didn't re-init.
            // Let's do a final pass for accurate counts if needed, but the loop counts are good enough approx
            // We need to count again because clusters object is reset every loop.
            return {
                r: c.r,
                g: c.g,
                b: c.b,
                count: 0
            };
        });

        // Final assignment to get counts
        for (let i = 0; i < pixels.length; i++) {
            const p = pixels[i];
            let minDist = Infinity;
            let clusterIdx = 0;

            for (let j = 0; j < k; j++) {
                const c = centroids[j];
                const dist = (p.r - c.r)**2 + (p.g - c.g)**2 + (p.b - c.b)**2;
                if (dist < minDist) {
                    minDist = dist;
                    clusterIdx = j;
                }
            }
            resultClusters[clusterIdx].count++;
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                clusters: resultClusters,
                time: endTime - startTime,
                iterations: iterations
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
