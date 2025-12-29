self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Apply Sobel edge detection
    const edges = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = -gray[idx - width - 1] - 2 * gray[idx - 1] - gray[idx + width - 1] +
                        gray[idx - width + 1] + 2 * gray[idx + 1] + gray[idx + width + 1];
            const gy = -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
                        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];
            edges[idx] = Math.sqrt(gx * gx + gy * gy);
        }
    }

    // Calculate edge density in sliding windows (text has high edge density)
    const windowSize = 8;
    const density = new Float32Array(width * height);

    for (let y = windowSize; y < height - windowSize; y++) {
        for (let x = windowSize; x < width - windowSize; x++) {
            let sum = 0;
            for (let dy = -windowSize; dy < windowSize; dy++) {
                for (let dx = -windowSize; dx < windowSize; dx++) {
                    sum += edges[(y + dy) * width + (x + dx)];
                }
            }
            density[y * width + x] = sum / (windowSize * windowSize * 4);
        }
    }

    // Threshold density to find text regions
    const threshold = 30;
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < density.length; i++) {
        binary[i] = density[i] > threshold ? 255 : 0;
    }

    // Morphological closing to merge nearby text
    const closed = morphClose(binary, width, height, 10);

    // Find connected regions
    const labels = new Int32Array(width * height);
    const regions = [];
    let nextLabel = 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (closed[idx] > 0 && labels[idx] === 0) {
                const stats = floodFill(closed, labels, width, height, x, y, nextLabel);
                // Filter by size (text regions have certain characteristics)
                if (stats.count > 50 && stats.width > 10 && stats.height > 5) {
                    regions.push(stats);
                }
                nextLabel++;
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw text regions
    for (const region of regions) {
        const x0 = Math.max(0, region.minX - 3);
        const y0 = Math.max(0, region.minY - 3);
        const x1 = Math.min(width - 1, region.maxX + 3);
        const y1 = Math.min(height - 1, region.maxY + 3);

        // Draw rectangle
        for (let x = x0; x <= x1; x++) {
            setPixel(output, width, x, y0, 0, 200, 0);
            setPixel(output, width, x, y1, 0, 200, 0);
        }
        for (let y = y0; y <= y1; y++) {
            setPixel(output, width, x0, y, 0, 200, 0);
            setPixel(output, width, x1, y, 0, 200, 0);
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        regions: regions.length
    });
};

function setPixel(data, width, x, y, r, g, b) {
    const idx = (y * width + x) * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
}

function morphClose(mask, width, height, size) {
    const dilated = dilate(mask, width, height, size);
    return erode(dilated, width, height, size);
}

function dilate(mask, width, height, size) {
    const result = new Uint8Array(width * height);
    const half = Math.floor(size / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let maxVal = 0;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        maxVal = Math.max(maxVal, mask[ny * width + nx]);
                    }
                }
            }
            result[y * width + x] = maxVal;
        }
    }
    return result;
}

function erode(mask, width, height, size) {
    const result = new Uint8Array(width * height);
    const half = Math.floor(size / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let minVal = 255;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        minVal = Math.min(minVal, mask[ny * width + nx]);
                    }
                }
            }
            result[y * width + x] = minVal;
        }
    }
    return result;
}

function floodFill(mask, labels, width, height, startX, startY, label) {
    const queue = [[startX, startY]];
    let count = 0;
    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const idx = y * width + x;
        if (mask[idx] === 0 || labels[idx] !== 0) continue;

        labels[idx] = label;
        count++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return { count, minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
