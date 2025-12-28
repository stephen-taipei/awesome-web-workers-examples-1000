self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Calculate horizontal gradient (Scharr operator)
    const gradX = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = -3 * gray[idx - width - 1] - 10 * gray[idx - 1] - 3 * gray[idx + width - 1] +
                        3 * gray[idx - width + 1] + 10 * gray[idx + 1] + 3 * gray[idx + width + 1];
            gradX[idx] = Math.abs(gx);
        }
    }

    // Calculate vertical gradient
    const gradY = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gy = -3 * gray[idx - width - 1] - 10 * gray[idx - width] - 3 * gray[idx - width + 1] +
                        3 * gray[idx + width - 1] + 10 * gray[idx + width] + 3 * gray[idx + width + 1];
            gradY[idx] = Math.abs(gy);
        }
    }

    // Barcode has high horizontal gradient, low vertical gradient
    const barcodeScore = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const score = gradX[i] - gradY[i];
        barcodeScore[i] = score > 0 ? score : 0;
    }

    // Apply blur to consolidate regions
    const blurred = blur(barcodeScore, width, height, 5);

    // Threshold
    const threshold = 50;
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < blurred.length; i++) {
        binary[i] = blurred[i] > threshold ? 255 : 0;
    }

    // Morphological closing
    const closed = morphClose(binary, width, height, 15);

    // Find connected regions
    const labels = new Int32Array(width * height);
    const regions = [];
    let nextLabel = 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (closed[idx] > 0 && labels[idx] === 0) {
                const stats = floodFill(closed, labels, width, height, x, y, nextLabel);
                if (stats.count > 100 && stats.width > stats.height * 1.5) {
                    regions.push(stats);
                }
                nextLabel++;
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw barcode regions
    for (const region of regions) {
        const x0 = Math.max(0, region.minX - 5);
        const y0 = Math.max(0, region.minY - 5);
        const x1 = Math.min(width - 1, region.maxX + 5);
        const y1 = Math.min(height - 1, region.maxY + 5);

        // Draw rectangle
        for (let x = x0; x <= x1; x++) {
            setPixel(output, width, x, y0, 255, 0, 0);
            setPixel(output, width, x, y0 + 1, 255, 0, 0);
            setPixel(output, width, x, y1, 255, 0, 0);
            setPixel(output, width, x, y1 - 1, 255, 0, 0);
        }
        for (let y = y0; y <= y1; y++) {
            setPixel(output, width, x0, y, 255, 0, 0);
            setPixel(output, width, x0 + 1, y, 255, 0, 0);
            setPixel(output, width, x1, y, 255, 0, 0);
            setPixel(output, width, x1 - 1, y, 255, 0, 0);
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        barcodes: regions.length
    });
};

function setPixel(data, width, x, y, r, g, b) {
    const idx = (y * width + x) * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
}

function blur(input, width, height, size) {
    const output = new Float32Array(width * height);
    const half = Math.floor(size / 2);

    for (let y = half; y < height - half; y++) {
        for (let x = half; x < width - half; x++) {
            let sum = 0;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    sum += input[(y + dy) * width + (x + dx)];
                }
            }
            output[y * width + x] = sum / (size * size);
        }
    }
    return output;
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
