self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Calculate gradients
    const Ix = new Float32Array(width * height);
    const Iy = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            Ix[idx] = (gray[idx + 1] - gray[idx - 1]) / 2;
            Iy[idx] = (gray[idx + width] - gray[idx - width]) / 2;
        }
    }

    // Calculate Harris response
    const k = 0.04;
    const windowSize = 3;
    const halfWindow = Math.floor(windowSize / 2);
    const R = new Float32Array(width * height);
    let maxR = 0;

    for (let y = halfWindow; y < height - halfWindow; y++) {
        for (let x = halfWindow; x < width - halfWindow; x++) {
            let sumIx2 = 0, sumIy2 = 0, sumIxIy = 0;

            for (let wy = -halfWindow; wy <= halfWindow; wy++) {
                for (let wx = -halfWindow; wx <= halfWindow; wx++) {
                    const idx = (y + wy) * width + (x + wx);
                    sumIx2 += Ix[idx] * Ix[idx];
                    sumIy2 += Iy[idx] * Iy[idx];
                    sumIxIy += Ix[idx] * Iy[idx];
                }
            }

            const det = sumIx2 * sumIy2 - sumIxIy * sumIxIy;
            const trace = sumIx2 + sumIy2;
            const idx = y * width + x;
            R[idx] = det - k * trace * trace;
            if (R[idx] > maxR) maxR = R[idx];
        }
    }

    // Non-maximum suppression and thresholding
    const corners = [];
    const thresholdVal = threshold * maxR;

    for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
            const idx = y * width + x;
            if (R[idx] > thresholdVal) {
                // Check if local maximum
                let isMax = true;
                for (let dy = -1; dy <= 1 && isMax; dy++) {
                    for (let dx = -1; dx <= 1 && isMax; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (R[(y + dy) * width + (x + dx)] > R[idx]) {
                            isMax = false;
                        }
                    }
                }
                if (isMax) {
                    corners.push({ x, y });
                }
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw corners as red circles
    for (const corner of corners) {
        const r = 3;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    const nx = corner.x + dx;
                    const ny = corner.y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        output[idx] = 255;
                        output[idx + 1] = 0;
                        output[idx + 2] = 0;
                    }
                }
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        corners: corners.length
    });
};
