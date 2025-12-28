self.onmessage = function(e) {
    const { imageData, numSuperpixels, compactness } = e.data;
    const { width, height, data } = imageData;

    // Convert to Lab color space (simplified)
    const lab = new Float32Array(width * height * 3);
    for (let i = 0; i < data.length; i += 4) {
        const idx = (i / 4) * 3;
        // Simple RGB to Lab approximation
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        lab[idx] = 0.2126 * r + 0.7152 * g + 0.0722 * b; // L
        lab[idx + 1] = r - g; // a approximation
        lab[idx + 2] = b - (r + g) / 2; // b approximation
    }

    // Calculate grid step
    const S = Math.sqrt(width * height / numSuperpixels);

    // Initialize cluster centers
    const centers = [];
    for (let y = S / 2; y < height; y += S) {
        for (let x = S / 2; x < width; x += S) {
            const ix = Math.floor(x), iy = Math.floor(y);
            if (ix < width && iy < height) {
                const idx = iy * width + ix;
                centers.push({
                    x: ix, y: iy,
                    l: lab[idx * 3],
                    a: lab[idx * 3 + 1],
                    b: lab[idx * 3 + 2]
                });
            }
        }
    }

    // Labels and distances
    const labels = new Int32Array(width * height).fill(-1);
    const distances = new Float32Array(width * height).fill(Infinity);

    // SLIC iterations
    const iterations = 10;
    const m = compactness;

    for (let iter = 0; iter < iterations; iter++) {
        // Assignment step
        for (let k = 0; k < centers.length; k++) {
            const c = centers[k];
            const x0 = Math.max(0, Math.floor(c.x - S));
            const x1 = Math.min(width, Math.ceil(c.x + S));
            const y0 = Math.max(0, Math.floor(c.y - S));
            const y1 = Math.min(height, Math.ceil(c.y + S));

            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    const idx = y * width + x;
                    const labIdx = idx * 3;

                    const dl = lab[labIdx] - c.l;
                    const da = lab[labIdx + 1] - c.a;
                    const db = lab[labIdx + 2] - c.b;
                    const dx = x - c.x;
                    const dy = y - c.y;

                    const colorDist = dl * dl + da * da + db * db;
                    const spatialDist = dx * dx + dy * dy;
                    const D = colorDist + (m * m / (S * S)) * spatialDist;

                    if (D < distances[idx]) {
                        distances[idx] = D;
                        labels[idx] = k;
                    }
                }
            }
        }

        // Update step
        const sums = centers.map(() => ({ x: 0, y: 0, l: 0, a: 0, b: 0, count: 0 }));

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const k = labels[idx];
                if (k >= 0) {
                    const labIdx = idx * 3;
                    sums[k].x += x;
                    sums[k].y += y;
                    sums[k].l += lab[labIdx];
                    sums[k].a += lab[labIdx + 1];
                    sums[k].b += lab[labIdx + 2];
                    sums[k].count++;
                }
            }
        }

        for (let k = 0; k < centers.length; k++) {
            if (sums[k].count > 0) {
                centers[k].x = sums[k].x / sums[k].count;
                centers[k].y = sums[k].y / sums[k].count;
                centers[k].l = sums[k].l / sums[k].count;
                centers[k].a = sums[k].a / sums[k].count;
                centers[k].b = sums[k].b / sums[k].count;
            }
        }

        // Reset distances for next iteration
        distances.fill(Infinity);
    }

    // Create output with average colors per superpixel
    const output = new Uint8ClampedArray(data.length);
    const avgColors = centers.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (let i = 0; i < labels.length; i++) {
        const k = labels[i];
        if (k >= 0) {
            const pidx = i * 4;
            avgColors[k].r += data[pidx];
            avgColors[k].g += data[pidx + 1];
            avgColors[k].b += data[pidx + 2];
            avgColors[k].count++;
        }
    }

    for (let i = 0; i < labels.length; i++) {
        const k = labels[i];
        const pidx = i * 4;
        if (k >= 0 && avgColors[k].count > 0) {
            output[pidx] = avgColors[k].r / avgColors[k].count;
            output[pidx + 1] = avgColors[k].g / avgColors[k].count;
            output[pidx + 2] = avgColors[k].b / avgColors[k].count;
        }
        output[pidx + 3] = 255;
    }

    // Draw boundaries
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const label = labels[idx];
            if (labels[idx - 1] !== label || labels[idx + 1] !== label ||
                labels[idx - width] !== label || labels[idx + width] !== label) {
                const pidx = idx * 4;
                output[pidx] = 0;
                output[pidx + 1] = 0;
                output[pidx + 2] = 0;
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        count: centers.length
    });
};
