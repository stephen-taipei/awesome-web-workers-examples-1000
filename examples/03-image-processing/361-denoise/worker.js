self.onmessage = function(e) {
    const { imageData, strength, windowSize, patchSize } = e.data;
    const startTime = performance.now();

    try {
        const resultImageData = denoiseNLMeans(imageData, strength, windowSize, patchSize);
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

function denoiseNLMeans(imageData, h, windowSize, patchSize) {
    // A simplified Non-Local Means filter implementation.
    // Full NL-means is very slow O(N^2) or O(W*H * search_window^2 * patch_size^2).
    // Here we implement it straight-forwardly but optimized with typed arrays.

    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;
    const dest = new Uint8ClampedArray(src.length);

    // Parameters
    // h: filtering parameter (strength)
    // searchWindow: radius of search area (e.g. 7 means 15x15 window)
    // patchRadius: radius of patch (e.g. 1 means 3x3 patch)

    const searchRadius = Math.floor(windowSize / 2);
    const patchRadius = Math.floor(patchSize / 2);
    const h2 = h * h;

    // Pre-compute weights lookup table is not easy because distance varies.
    // We will just compute exponential.

    // We process each pixel
    for (let y = 0; y < height; y++) {
        // Report progress per row
        self.postMessage({ type: 'progress', progress: y / height });

        for (let x = 0; x < width; x++) {
            let totalWeight = 0;
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;

            // Define search window boundaries
            const minX = Math.max(0, x - searchRadius);
            const maxX = Math.min(width - 1, x + searchRadius);
            const minY = Math.max(0, y - searchRadius);
            const maxY = Math.min(height - 1, y + searchRadius);

            // Center pixel patch
            // Optimization: If patch is 1x1, it's just pixel comparison (Bilateral filter).
            // If patch > 1x1, we compare patches.

            // Iterate over search window
            for (let sy = minY; sy <= maxY; sy++) {
                for (let sx = minX; sx <= maxX; sx++) {

                    // Calculate distance between patch at (x,y) and patch at (sx, sy)
                    let dist = 0;

                    for (let py = -patchRadius; py <= patchRadius; py++) {
                        for (let px = -patchRadius; px <= patchRadius; px++) {
                            // Coordinate of pixel in patch 1
                            let cx = x + px;
                            let cy = y + py;
                            // Coordinate of pixel in patch 2
                            let csx = sx + px;
                            let csy = sy + py;

                            // Check bounds
                            if (cx < 0 || cx >= width || cy < 0 || cy >= height ||
                                csx < 0 || csx >= width || csy < 0 || csy >= height) {
                                continue;
                            }

                            const idx1 = (cy * width + cx) * 4;
                            const idx2 = (csy * width + csx) * 4;

                            // Euclidean distance squared in RGB space
                            const dr = src[idx1] - src[idx2];
                            const dg = src[idx1+1] - src[idx2+1];
                            const db = src[idx1+2] - src[idx2+2];

                            dist += (dr*dr + dg*dg + db*db);
                        }
                    }

                    // Normalize distance by patch size (number of pixels)
                    // dist /= ((patchRadius*2+1)**2); // Optional, can be absorbed in h
                    // Actually usually weighted by Gaussian kernel within patch, but uniform is fine for simple impl.
                    const patchArea = (patchRadius * 2 + 1) ** 2;
                    const normalizedDist = dist / patchArea; // Average distance per pixel

                    // Weight
                    const weight = Math.exp(-Math.max(0, normalizedDist - 2 * h2) / h2); // Modified implementation
                    // Standard: exp(-dist / h2)
                    // const weight = Math.exp(-normalizedDist / h2);

                    const sIdx = (sy * width + sx) * 4;
                    sumR += src[sIdx] * weight;
                    sumG += src[sIdx+1] * weight;
                    sumB += src[sIdx+2] * weight;
                    totalWeight += weight;
                }
            }

            const idx = (y * width + x) * 4;
            // Max weight logic to handle self-similarity if needed, but here loop includes self.

            dest[idx] = sumR / totalWeight;
            dest[idx+1] = sumG / totalWeight;
            dest[idx+2] = sumB / totalWeight;
            dest[idx+3] = src[idx+3];
        }
    }

    return new ImageData(dest, width, height);
}
