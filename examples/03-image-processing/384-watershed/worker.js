self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Calculate gradient magnitude
    const gradient = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = gray[idx + 1] - gray[idx - 1];
            const gy = gray[idx + width] - gray[idx - width];
            gradient[idx] = Math.sqrt(gx * gx + gy * gy);
        }
    }

    // Find local minima as markers
    const MARKER = -1;
    const WSHED = 0;
    const labels = new Int32Array(width * height);
    let nextLabel = 1;

    // Mark local minima
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const val = gradient[idx];

            if (val < threshold) {
                let isMinimum = true;
                for (let dy = -1; dy <= 1 && isMinimum; dy++) {
                    for (let dx = -1; dx <= 1 && isMinimum; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (gradient[(y + dy) * width + (x + dx)] < val - 1) {
                            isMinimum = false;
                        }
                    }
                }
                if (isMinimum) {
                    labels[idx] = MARKER;
                }
            }
        }
    }

    // Label connected markers
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (labels[idx] === MARKER) {
                floodFill(labels, width, height, x, y, nextLabel++);
            }
        }
    }

    // Simplified watershed: grow regions based on gradient
    const queue = [];

    // Initialize queue with boundary pixels
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (labels[idx] > 0) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nidx = (y + dy) * width + (x + dx);
                        if (labels[nidx] === 0) {
                            queue.push({ x, y, label: labels[idx], gradient: gradient[idx] });
                            break;
                        }
                    }
                }
            }
        }
    }

    // Sort by gradient
    queue.sort((a, b) => a.gradient - b.gradient);

    // Grow regions
    while (queue.length > 0) {
        const { x, y, label } = queue.shift();
        const idx = y * width + x;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                const nidx = ny * width + nx;
                if (labels[nidx] === 0) {
                    labels[nidx] = label;
                    queue.push({ x: nx, y: ny, label, gradient: gradient[nidx] });
                }
            }
        }
    }

    // Count unique regions
    const uniqueLabels = new Set(labels);
    uniqueLabels.delete(0);

    // Generate colors for each region
    const colors = [[0, 0, 0]];
    for (let i = 1; i <= nextLabel; i++) {
        colors.push([
            Math.floor(Math.random() * 200) + 55,
            Math.floor(Math.random() * 200) + 55,
            Math.floor(Math.random() * 200) + 55
        ]);
    }

    // Create output image
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const color = colors[label] || [0, 0, 0];

        // Blend with original
        output[i * 4] = Math.floor((data[i * 4] + color[0]) / 2);
        output[i * 4 + 1] = Math.floor((data[i * 4 + 1] + color[1]) / 2);
        output[i * 4 + 2] = Math.floor((data[i * 4 + 2] + color[2]) / 2);
        output[i * 4 + 3] = 255;
    }

    // Draw boundaries
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const label = labels[idx];
            let isBoundary = false;

            for (let dy = -1; dy <= 1 && !isBoundary; dy++) {
                for (let dx = -1; dx <= 1 && !isBoundary; dx++) {
                    if (labels[(y + dy) * width + (x + dx)] !== label) {
                        isBoundary = true;
                    }
                }
            }

            if (isBoundary) {
                output[idx * 4] = 255;
                output[idx * 4 + 1] = 255;
                output[idx * 4 + 2] = 255;
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        regions: uniqueLabels.size
    });
};

function floodFill(labels, width, height, startX, startY, label) {
    const queue = [[startX, startY]];
    const MARKER = -1;

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const idx = y * width + x;
        if (labels[idx] !== MARKER) continue;

        labels[idx] = label;

        queue.push([x + 1, y]);
        queue.push([x - 1, y]);
        queue.push([x, y + 1]);
        queue.push([x, y - 1]);
    }
}
