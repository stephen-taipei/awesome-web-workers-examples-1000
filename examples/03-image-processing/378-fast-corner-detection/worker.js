// worker.js

self.onmessage = function(e) {
    const { imageData, threshold, nms } = e.data;

    try {
        const startTime = performance.now();
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // 1. Grayscale
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            gray[i] = Math.round(data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114);
        }

        self.postMessage({ type: 'progress', data: 20 });

        // 2. FAST Algorithm (FAST-9)
        // Tests 16 pixels around a circle radius 3.
        // Offsets relative to center p (x,y)
        // 0: (0,-3), 1: (1,-3), 2: (2,-2), 3: (3,-1), 4: (3,0), 5: (3,1), 6: (2,2), 7: (1,3)
        // 8: (0,3), 9: (-1,3), 10: (-2,2), 11: (-3,1), 12: (-3,0), 13: (-3,-1), 14: (-2,-2), 15: (-1,-3)

        const offsets = [
            0, -3,  1, -3,  2, -2,  3, -1,
            3, 0,   3, 1,   2, 2,   1, 3,
            0, 3,  -1, 3,  -2, 2,  -3, 1,
            -3, 0, -3, -1, -2, -2, -1, -3
        ];

        // Pre-calculate index offsets
        const pixelOffsets = new Int32Array(16);
        for (let i = 0; i < 16; i++) {
            pixelOffsets[i] = offsets[i*2+1] * width + offsets[i*2];
        }

        const scores = new Float32Array(width * height); // For NMS
        const candidates = []; // List of candidate indices

        // Margin 3
        for (let y = 3; y < height - 3; y++) {
            for (let x = 3; x < width - 3; x++) {
                const idx = y * width + x;
                const p = gray[idx];
                const t = threshold;

                // High-speed test
                // Check pixels 1, 5, 9, 13 (indices 0, 4, 8, 12 in our offset array)
                // If at least 3 of these are significantly brighter or darker, we proceed.

                let darkerCount = 0;
                let brighterCount = 0;

                const p1 = gray[idx + pixelOffsets[0]];
                const p5 = gray[idx + pixelOffsets[4]];
                const p9 = gray[idx + pixelOffsets[8]];
                const p13 = gray[idx + pixelOffsets[12]];

                if (p1 > p + t) brighterCount++;
                else if (p1 < p - t) darkerCount++;

                if (p5 > p + t) brighterCount++;
                else if (p5 < p - t) darkerCount++;

                if (p9 > p + t) brighterCount++;
                else if (p9 < p - t) darkerCount++;

                if (p13 > p + t) brighterCount++;
                else if (p13 < p - t) darkerCount++;

                if (brighterCount < 3 && darkerCount < 3) continue;

                // Full test
                // Check if 9 contiguous pixels are all brighter or all darker
                // This can be optimized by bitmask or simple loops

                // Get all 16 neighbors
                const neighbors = new Uint8Array(16);
                for(let k=0; k<16; k++) {
                    neighbors[k] = gray[idx + pixelOffsets[k]];
                }

                let isCorner = false;
                let score = 0;

                // Check brighter
                if (brighterCount >= 3) {
                     // Check for 9 contiguous
                     // Double the array for easy circular check
                     // or just use modulo

                     let contiguous = 0;
                     for(let k=0; k<25; k++) { // 16 + 8 wraps
                         const val = neighbors[k % 16];
                         if (val > p + t) {
                             contiguous++;
                             if (contiguous >= 9) {
                                 isCorner = true;
                                 // Compute score for NMS (sum of absolute difference?)
                                 // FAST score: sum of absolute difference between p and the pixels in the arc
                                 // Simplified: max(sum(diff - t)) for brighter/darker
                                 break;
                             }
                         } else {
                             contiguous = 0;
                         }
                     }
                     if (isCorner) {
                         // Calculate score (Sum of absolute differences for the contiguous arc)
                         // For simplicity, just sum of differences for all brighter pixels in ring
                         for(let k=0; k<16; k++) {
                             if (neighbors[k] > p + t) score += (neighbors[k] - p - t);
                         }
                     }
                }

                // Check darker if not already found
                if (!isCorner && darkerCount >= 3) {
                     let contiguous = 0;
                     for(let k=0; k<25; k++) {
                         const val = neighbors[k % 16];
                         if (val < p - t) {
                             contiguous++;
                             if (contiguous >= 9) {
                                 isCorner = true;
                                 break;
                             }
                         } else {
                             contiguous = 0;
                         }
                     }
                     if (isCorner) {
                         for(let k=0; k<16; k++) {
                             if (neighbors[k] < p - t) score += (p - neighbors[k] - t);
                         }
                     }
                }

                if (isCorner) {
                    candidates.push(idx);
                    if (nms) scores[idx] = score;
                }
            }

            if (y % 50 === 0) self.postMessage({ type: 'progress', data: 20 + (y / height) * 60 });
        }

        self.postMessage({ type: 'progress', data: 80 });

        // 3. Non-Maximal Suppression
        const finalKeypoints = [];

        if (nms) {
            for (let i = 0; i < candidates.length; i++) {
                const idx = candidates[i];
                const score = scores[idx];
                const y = Math.floor(idx / width);
                const x = idx % width;

                let isMax = true;

                // Check 3x3 neighborhood (or larger?)
                // Usually 3x3 is enough for corners
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const neighborIdx = (y + dy) * width + (x + dx);
                        // Check if neighbor is a candidate (has score > 0) and has higher score
                        if (scores[neighborIdx] > score) {
                            isMax = false;
                            break;
                        }
                    }
                    if (!isMax) break;
                }

                if (isMax) {
                    finalKeypoints.push({x, y, score});
                }
            }
        } else {
            for (let i = 0; i < candidates.length; i++) {
                const idx = candidates[i];
                const y = Math.floor(idx / width);
                const x = idx % width;
                finalKeypoints.push({x, y});
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                keypoints: finalKeypoints,
                time: endTime - startTime,
                width: width,
                height: height
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
