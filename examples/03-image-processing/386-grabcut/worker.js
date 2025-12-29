self.onmessage = function(e) {
    const { imageData, rect } = e.data;
    const { width, height, data } = imageData;

    // Simplified GrabCut: use color model inside/outside rect
    const FG = 1, BG = 0, PR_FG = 3, PR_BG = 2;
    const mask = new Uint8Array(width * height);

    // Initialize mask based on rect
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (x >= rect.x && x < rect.x + rect.width &&
                y >= rect.y && y < rect.y + rect.height) {
                mask[idx] = PR_FG;
            } else {
                mask[idx] = BG;
            }
        }
    }

    // Build color models
    function buildColorModel(maskValue) {
        let sum = [0, 0, 0], count = 0;
        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === maskValue || mask[i] === maskValue + 2) {
                const pidx = i * 4;
                sum[0] += data[pidx];
                sum[1] += data[pidx + 1];
                sum[2] += data[pidx + 2];
                count++;
            }
        }
        return count > 0 ? sum.map(s => s / count) : [128, 128, 128];
    }

    // Iterative refinement
    const iterations = 5;
    for (let iter = 0; iter < iterations; iter++) {
        const fgModel = buildColorModel(FG);
        const bgModel = buildColorModel(BG);

        // Reassign probable pixels
        for (let y = rect.y; y < rect.y + rect.height; y++) {
            for (let x = rect.x; x < rect.x + rect.width; x++) {
                if (x < 0 || x >= width || y < 0 || y >= height) continue;

                const idx = y * width + x;
                if (mask[idx] === FG || mask[idx] === BG) continue;

                const pidx = idx * 4;
                const r = data[pidx], g = data[pidx + 1], b = data[pidx + 2];

                const fgDist = Math.sqrt(
                    Math.pow(r - fgModel[0], 2) +
                    Math.pow(g - fgModel[1], 2) +
                    Math.pow(b - fgModel[2], 2)
                );

                const bgDist = Math.sqrt(
                    Math.pow(r - bgModel[0], 2) +
                    Math.pow(g - bgModel[1], 2) +
                    Math.pow(b - bgModel[2], 2)
                );

                mask[idx] = fgDist < bgDist ? PR_FG : PR_BG;
            }
        }

        // Spatial smoothing
        const newMask = new Uint8Array(mask);
        for (let y = rect.y + 1; y < rect.y + rect.height - 1; y++) {
            for (let x = rect.x + 1; x < rect.x + rect.width - 1; x++) {
                if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;

                const idx = y * width + x;
                if (mask[idx] === FG || mask[idx] === BG) continue;

                let fgCount = 0, bgCount = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nidx = (y + dy) * width + (x + dx);
                        if (mask[nidx] === FG || mask[nidx] === PR_FG) fgCount++;
                        else bgCount++;
                    }
                }

                if (fgCount > bgCount + 2) newMask[idx] = PR_FG;
                else if (bgCount > fgCount + 2) newMask[idx] = PR_BG;
            }
        }

        for (let i = 0; i < mask.length; i++) {
            mask[i] = newMask[i];
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < mask.length; i++) {
        const pidx = i * 4;
        if (mask[i] === FG || mask[i] === PR_FG) {
            output[pidx] = data[pidx];
            output[pidx + 1] = data[pidx + 1];
            output[pidx + 2] = data[pidx + 2];
            output[pidx + 3] = 255;
        } else {
            // Transparent background
            output[pidx] = 200;
            output[pidx + 1] = 200;
            output[pidx + 2] = 200;
            output[pidx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
