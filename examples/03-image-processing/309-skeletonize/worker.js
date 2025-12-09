self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;

    // 1. Binarize (0 or 1)
    // We'll work on a simple 1D array of 0s and 1s for processing, then convert back to ImageData
    const pixels = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        // Simple luminance or just check R channel
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels[i] = luminance > threshold ? 1 : 0;
        // Note: Skeletonize usually works on foreground = 1 (white), background = 0 (black).
        // If image is dark text on white, we might need to invert.
        // Let's assume user wants to skeletonize bright objects on dark background.
        // If user input is typical document (black text on white), they should invert first or we assume < threshold is object.
        // Let's stick to standard: > threshold is object (white on black).
    }

    // Zhang-Suen Thinning Algorithm
    let changing = true;
    let iter = 0;

    // To avoid creating new arrays constantly, we use a marker list for pixels to delete
    // Or just a copy. A copy is safer for parallel logic simulation.
    // Zhang-Suen has two sub-iterations.

    while (changing) {
        changing = false;
        iter++;

        if (iter % 10 === 0) {
             self.postMessage({ type: 'progress', progress: iter });
        }

        const toDelete = [];

        // Sub-iteration 1
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const p1 = pixels[y * width + x];
                if (p1 === 0) continue;

                const p2 = pixels[(y - 1) * width + x];
                const p3 = pixels[(y - 1) * width + x + 1];
                const p4 = pixels[y * width + x + 1];
                const p5 = pixels[(y + 1) * width + x + 1];
                const p6 = pixels[(y + 1) * width + x];
                const p7 = pixels[(y + 1) * width + x - 1];
                const p8 = pixels[y * width + x - 1];
                const p9 = pixels[(y - 1) * width + x - 1];

                const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];
                const B = neighbors.reduce((a, b) => a + b, 0);

                let A = 0;
                for (let i = 0; i < 8; i++) {
                    if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) {
                        A++;
                    }
                }

                const c1 = (p2 * p4 * p6);
                const c2 = (p4 * p6 * p8);

                if (B >= 2 && B <= 6 && A === 1 && c1 === 0 && c2 === 0) {
                    toDelete.push(y * width + x);
                    changing = true;
                }
            }
        }

        for (const idx of toDelete) {
            pixels[idx] = 0;
        }

        toDelete.length = 0;

        // Sub-iteration 2
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const p1 = pixels[y * width + x];
                if (p1 === 0) continue;

                const p2 = pixels[(y - 1) * width + x];
                const p3 = pixels[(y - 1) * width + x + 1];
                const p4 = pixels[y * width + x + 1];
                const p5 = pixels[(y + 1) * width + x + 1];
                const p6 = pixels[(y + 1) * width + x];
                const p7 = pixels[(y + 1) * width + x - 1];
                const p8 = pixels[y * width + x - 1];
                const p9 = pixels[(y - 1) * width + x - 1];

                const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];
                const B = neighbors.reduce((a, b) => a + b, 0);

                let A = 0;
                for (let i = 0; i < 8; i++) {
                    if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) {
                        A++;
                    }
                }

                const c1 = (p2 * p4 * p8);
                const c2 = (p2 * p6 * p8);

                if (B >= 2 && B <= 6 && A === 1 && c1 === 0 && c2 === 0) {
                    toDelete.push(y * width + x);
                    changing = true;
                }
            }
        }

        for (const idx of toDelete) {
            pixels[idx] = 0;
        }
    }

    // Convert back to ImageData
    const resultData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        const val = pixels[i] === 1 ? 255 : 0;
        resultData[i * 4] = val;
        resultData[i * 4 + 1] = val;
        resultData[i * 4 + 2] = val;
        resultData[i * 4 + 3] = 255;
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(resultData, width, height),
        duration: Math.round(endTime - startTime),
        iterations: iter
    });
};
