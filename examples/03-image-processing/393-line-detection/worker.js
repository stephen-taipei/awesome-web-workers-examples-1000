self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const startTime = performance.now();

    try {
        const { width, height, data } = imageData;

        // 1. Grayscale
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        // 2. Edge Detection (Sobel + Threshold)
        // We need only edge points
        const edges = [];
        const edgeThresh = 100;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const p00 = gray[(y-1)*width + (x-1)];
                const p02 = gray[(y-1)*width + (x+1)];
                const p10 = gray[y*width + (x-1)];
                const p12 = gray[y*width + (x+1)];
                const p20 = gray[(y+1)*width + (x-1)];
                const p22 = gray[(y+1)*width + (x+1)];

                const gx = (p02 + 2*p12 + p22) - (p00 + 2*p10 + p20);
                const gy = (p20 + 2*p21 + p22) - (p00 + 2*p01 + p02); // p01 needed
                const p01 = gray[(y-1)*width + x];
                const p21 = gray[(y+1)*width + x];
                const gy_correct = (p20 + 2*p21 + p22) - (p00 + 2*p01 + p02);

                const mag = Math.sqrt(gx*gx + gy_correct*gy_correct);
                if (mag > edgeThresh) {
                    edges.push({x, y});
                }
            }
        }

        // 3. Hough Transform
        // Theta range: -90 to 90 degrees (or 0 to 180)
        // Let's use 0 to PI
        const numThetas = 180;
        const thetaStep = Math.PI / numThetas;

        // Rho range: max distance is diag
        const diag = Math.sqrt(width*width + height*height);
        const numRhos = Math.ceil(diag * 2); // -diag to +diag
        const rhoOffset = Math.ceil(diag);

        // Accumulator
        const accumulator = new Uint32Array(numRhos * numThetas);

        // Precompute sin/cos
        const cosTable = new Float32Array(numThetas);
        const sinTable = new Float32Array(numThetas);
        for (let t = 0; t < numThetas; t++) {
            const theta = t * thetaStep;
            cosTable[t] = Math.cos(theta);
            sinTable[t] = Math.sin(theta);
        }

        // Vote
        for (let i = 0; i < edges.length; i++) {
            const { x, y } = edges[i];

            for (let t = 0; t < numThetas; t++) {
                const rho = x * cosTable[t] + y * sinTable[t];
                const rhoIdx = Math.round(rho) + rhoOffset;

                if (rhoIdx >= 0 && rhoIdx < numRhos) {
                    accumulator[rhoIdx * numThetas + t]++;
                }
            }
        }

        // 4. Find Peaks
        const lines = [];
        for (let r = 0; r < numRhos; r++) {
            for (let t = 0; t < numThetas; t++) {
                const votes = accumulator[r * numThetas + t];
                if (votes >= threshold) {
                    // Local Maxima check (simple version: compare to immediate neighbors)
                    let isMax = true;
                    // Check simple 3x3 neighborhood in accumulator
                    // (Skipping for brevity/speed in simple demo, but highly recommended for better results)
                    // Let's just output raw peaks for now, but maybe too many lines.
                    // Let's implement minimal suppression

                    if (isLocalMaxima(accumulator, numRhos, numThetas, r, t, votes)) {
                        lines.push({
                            rho: r - rhoOffset,
                            theta: t * thetaStep,
                            votes: votes
                        });
                    }
                }
            }
        }

        // Sort by votes
        lines.sort((a, b) => b.votes - a.votes);

        // Limit number of lines to prevent browser freeze on drawing too many
        const topLines = lines.slice(0, 100);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                lines: topLines,
                time: Math.round(endTime - startTime)
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function isLocalMaxima(acc, h, w, r, t, val) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dt = -1; dt <= 1; dt++) {
            if (dr === 0 && dt === 0) continue;

            const nr = r + dr;
            const nt = t + dt;

            if (nr >= 0 && nr < h && nt >= 0 && nt < w) {
                if (acc[nr * w + nt] > val) return false;
            }
        }
    }
    return true;
}
