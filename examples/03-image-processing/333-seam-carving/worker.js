self.onmessage = function(e) {
    const { imageData, seamsToRemove } = e.data;
    let { width, height, data } = imageData;

    // We work with a flat array.
    // data is Uint8ClampedArray (RGBA)

    // Helper to get pixel index
    // idx = (y * width + x) * 4

    // Helper to compute luminance
    function getLuma(data, idx) {
        return 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
    }

    let currentWidth = width;
    let currentData = new Uint8ClampedArray(data);

    // Iteratively remove seams
    for (let k = 0; k < seamsToRemove; k++) {
        // 1. Calculate Energy Map (Dual-Gradient Energy Function)
        const energy = new Float32Array(currentWidth * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < currentWidth; x++) {
                const idx = (y * currentWidth + x) * 4;

                // x-gradient
                const xLeft = (x > 0) ? x - 1 : 0;
                const xRight = (x < currentWidth - 1) ? x + 1 : currentWidth - 1;
                const idxL = (y * currentWidth + xLeft) * 4;
                const idxR = (y * currentWidth + xRight) * 4;

                const rx = currentData[idxR] - currentData[idxL];
                const gx = currentData[idxR+1] - currentData[idxL+1];
                const bx = currentData[idxR+2] - currentData[idxL+2];
                const dX = rx*rx + gx*gx + bx*bx;

                // y-gradient
                const yUp = (y > 0) ? y - 1 : 0;
                const yDown = (y < height - 1) ? y + 1 : height - 1;
                const idxU = (yUp * currentWidth + x) * 4;
                const idxD = (yDown * currentWidth + x) * 4;

                const ry = currentData[idxD] - currentData[idxU];
                const gy = currentData[idxD+1] - currentData[idxU+1];
                const by = currentData[idxD+2] - currentData[idxU+2];
                const dY = ry*ry + gy*gy + by*by;

                energy[y * currentWidth + x] = dX + dY;
            }
        }

        // 2. Dynamic Programming for Minimal Energy Seam
        const dist = new Float32Array(currentWidth * height);
        // Initialize top row
        for (let x = 0; x < currentWidth; x++) {
            dist[x] = energy[x];
        }

        // DP
        for (let y = 1; y < height; y++) {
            for (let x = 0; x < currentWidth; x++) {
                const idx = y * currentWidth + x;

                // Check 3 neighbors above: (x-1, y-1), (x, y-1), (x+1, y-1)
                // Boundary checks implicitly handled by clamp or condition

                let minPrev = dist[(y-1)*currentWidth + x]; // Top

                if (x > 0) {
                    const tl = dist[(y-1)*currentWidth + (x-1)];
                    if (tl < minPrev) minPrev = tl;
                }
                if (x < currentWidth - 1) {
                    const tr = dist[(y-1)*currentWidth + (x+1)];
                    if (tr < minPrev) minPrev = tr;
                }

                dist[idx] = energy[idx] + minPrev;
            }
        }

        // 3. Backtrack to find seam path
        // Start from bottom row, find min
        let minY = height - 1;
        let minX = 0;
        let minVal = Infinity;

        for (let x = 0; x < currentWidth; x++) {
            const val = dist[minY * currentWidth + x];
            if (val < minVal) {
                minVal = val;
                minX = x;
            }
        }

        // Path array: stores x-coordinate for each y
        const seam = new Int32Array(height);
        seam[minY] = minX;

        for (let y = height - 1; y > 0; y--) {
            const x = seam[y];
            // Check parents: x-1, x, x+1 at row y-1
            // We need to match dist[y][x] == energy[y][x] + dist[y-1][parent_x]
            // Due to floating point or multiple paths, re-find min neighbor

            let bestPX = x;
            let minPVal = dist[(y-1)*currentWidth + x];

            if (x > 0) {
                const val = dist[(y-1)*currentWidth + (x-1)];
                if (val < minPVal) {
                    minPVal = val;
                    bestPX = x - 1;
                }
            }
            if (x < currentWidth - 1) {
                const val = dist[(y-1)*currentWidth + (x+1)];
                if (val < minPVal) { // strictly less to favor one side? or <=
                    minPVal = val;
                    bestPX = x + 1;
                }
            }
            seam[y-1] = bestPX;
        }

        // 4. Remove Seam
        const nextWidth = currentWidth - 1;
        const nextData = new Uint8ClampedArray(nextWidth * height * 4);

        for (let y = 0; y < height; y++) {
            const seamX = seam[y];
            // Copy pixels before seam
            // Source row start: y * currentWidth * 4
            // Dest row start: y * nextWidth * 4
            if (seamX > 0) {
                const start = y * currentWidth * 4;
                const end = start + seamX * 4;
                const destStart = y * nextWidth * 4;
                // TypedArray.set is faster than loop
                nextData.set(currentData.subarray(start, end), destStart);
            }
            // Copy pixels after seam
            if (seamX < currentWidth - 1) {
                const start = (y * currentWidth + seamX + 1) * 4;
                const end = (y + 1) * currentWidth * 4; // End of row
                const destStart = (y * nextWidth + seamX) * 4;
                nextData.set(currentData.subarray(start, end), destStart);
            }
        }

        currentData = nextData;
        currentWidth = nextWidth;

        // Report progress
        if (k % 5 === 0) {
            // Reconstruct ImageData for preview (optional, can be slow)
            const imgData = new ImageData(currentData, currentWidth, height);
            self.postMessage({
                type: 'progress',
                progress: ((k + 1) / seamsToRemove) * 100,
                imageData: imgData
            });
        }
    }

    // Final result
    const finalImageData = new ImageData(currentData, currentWidth, height);
    self.postMessage({
        type: 'done',
        progress: 100,
        imageData: finalImageData
    });
};
