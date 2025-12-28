self.onmessage = function(e) {
    const { imageData, maxPoints } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Calculate Shi-Tomasi corner strength (minimum eigenvalue)
    const features = [];
    const windowSize = 3;
    const half = Math.floor(windowSize / 2);

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

    // Calculate corner response
    for (let y = half + 1; y < height - half - 1; y++) {
        for (let x = half + 1; x < width - half - 1; x++) {
            let sumIx2 = 0, sumIy2 = 0, sumIxIy = 0;

            for (let wy = -half; wy <= half; wy++) {
                for (let wx = -half; wx <= half; wx++) {
                    const idx = (y + wy) * width + (x + wx);
                    sumIx2 += Ix[idx] * Ix[idx];
                    sumIy2 += Iy[idx] * Iy[idx];
                    sumIxIy += Ix[idx] * Iy[idx];
                }
            }

            // Minimum eigenvalue (Shi-Tomasi)
            const trace = sumIx2 + sumIy2;
            const det = sumIx2 * sumIy2 - sumIxIy * sumIxIy;
            const discriminant = trace * trace - 4 * det;
            const minEig = discriminant >= 0 ? (trace - Math.sqrt(discriminant)) / 2 : 0;

            if (minEig > 10) {
                features.push({ x, y, strength: minEig });
            }
        }
    }

    // Sort by strength and take top N
    features.sort((a, b) => b.strength - a.strength);

    // Non-maximum suppression with minimum distance
    const minDist = 10;
    const selected = [];

    for (const f of features) {
        let tooClose = false;
        for (const s of selected) {
            const dx = f.x - s.x;
            const dy = f.y - s.y;
            if (dx * dx + dy * dy < minDist * minDist) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) {
            selected.push(f);
            if (selected.length >= maxPoints) break;
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw features with orientation
    for (const f of selected) {
        // Draw cross
        const size = 4;
        for (let d = -size; d <= size; d++) {
            // Horizontal line
            if (f.x + d >= 0 && f.x + d < width) {
                const idx = (f.y * width + f.x + d) * 4;
                output[idx] = 0;
                output[idx + 1] = 255;
                output[idx + 2] = 0;
            }
            // Vertical line
            if (f.y + d >= 0 && f.y + d < height) {
                const idx = ((f.y + d) * width + f.x) * 4;
                output[idx] = 0;
                output[idx + 1] = 255;
                output[idx + 2] = 0;
            }
        }

        // Draw center
        const cidx = (f.y * width + f.x) * 4;
        output[cidx] = 255;
        output[cidx + 1] = 0;
        output[cidx + 2] = 0;
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        features: selected.length
    });
};
