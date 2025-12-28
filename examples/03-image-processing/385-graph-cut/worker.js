self.onmessage = function(e) {
    const { imageData, fgMarks, bgMarks } = e.data;
    const { width, height, data } = imageData;

    // Simple graph-cut approximation using region growing from seeds
    const labels = new Int8Array(width * height); // 0: unknown, 1: fg, -1: bg

    // Initialize seeds
    for (const { x, y } of fgMarks) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            labels[y * width + x] = 1;
        }
    }
    for (const { x, y } of bgMarks) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            labels[y * width + x] = -1;
        }
    }

    // Calculate average colors for fg and bg
    let fgColor = [0, 0, 0], bgColor = [0, 0, 0];
    let fgCount = 0, bgCount = 0;

    for (const { x, y } of fgMarks) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = (y * width + x) * 4;
            fgColor[0] += data[idx];
            fgColor[1] += data[idx + 1];
            fgColor[2] += data[idx + 2];
            fgCount++;
        }
    }
    for (const { x, y } of bgMarks) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const idx = (y * width + x) * 4;
            bgColor[0] += data[idx];
            bgColor[1] += data[idx + 1];
            bgColor[2] += data[idx + 2];
            bgCount++;
        }
    }

    if (fgCount > 0) {
        fgColor = fgColor.map(c => c / fgCount);
    }
    if (bgCount > 0) {
        bgColor = bgColor.map(c => c / bgCount);
    }

    // Assign unlabeled pixels based on color similarity
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (labels[idx] !== 0) continue;

            const pidx = idx * 4;
            const r = data[pidx], g = data[pidx + 1], b = data[pidx + 2];

            const fgDist = Math.sqrt(
                Math.pow(r - fgColor[0], 2) +
                Math.pow(g - fgColor[1], 2) +
                Math.pow(b - fgColor[2], 2)
            );

            const bgDist = Math.sqrt(
                Math.pow(r - bgColor[0], 2) +
                Math.pow(g - bgColor[1], 2) +
                Math.pow(b - bgColor[2], 2)
            );

            labels[idx] = fgDist < bgDist ? 1 : -1;
        }
    }

    // Smooth labels using iterative refinement
    const iterations = 5;
    for (let iter = 0; iter < iterations; iter++) {
        const newLabels = new Int8Array(labels);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                // Check if this is a seed pixel
                let isSeed = false;
                for (const m of fgMarks) {
                    if (m.x === x && m.y === y) isSeed = true;
                }
                for (const m of bgMarks) {
                    if (m.x === x && m.y === y) isSeed = true;
                }
                if (isSeed) continue;

                // Count neighbor labels
                let fgNeighbors = 0, bgNeighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nidx = (y + dy) * width + (x + dx);
                        if (labels[nidx] > 0) fgNeighbors++;
                        else if (labels[nidx] < 0) bgNeighbors++;
                    }
                }

                if (fgNeighbors > bgNeighbors + 2) newLabels[idx] = 1;
                else if (bgNeighbors > fgNeighbors + 2) newLabels[idx] = -1;
            }
        }

        for (let i = 0; i < labels.length; i++) {
            labels[i] = newLabels[i];
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < labels.length; i++) {
        const pidx = i * 4;
        if (labels[i] > 0) {
            // Foreground - show original
            output[pidx] = data[pidx];
            output[pidx + 1] = data[pidx + 1];
            output[pidx + 2] = data[pidx + 2];
            output[pidx + 3] = 255;
        } else {
            // Background - dim
            output[pidx] = Math.floor(data[pidx] * 0.3);
            output[pidx + 1] = Math.floor(data[pidx + 1] * 0.3);
            output[pidx + 2] = Math.floor(data[pidx + 2] * 0.3);
            output[pidx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
