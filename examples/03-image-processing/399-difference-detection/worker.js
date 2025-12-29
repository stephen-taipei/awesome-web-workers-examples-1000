self.onmessage = function(e) {
    const { image1, image2, threshold } = e.data;
    const width = Math.min(image1.width, image2.width);
    const height = Math.min(image1.height, image2.height);
    const data1 = image1.data;
    const data2 = image2.data;

    // Create difference mask
    const diffMask = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const dr = Math.abs(data1[i] - data2[i]);
            const dg = Math.abs(data1[i + 1] - data2[i + 1]);
            const db = Math.abs(data1[i + 2] - data2[i + 2]);
            const diff = (dr + dg + db) / 3;

            diffMask[y * width + x] = diff > threshold ? 255 : 0;
        }
    }

    // Morphological closing to merge nearby differences
    const closed = morphClose(diffMask, width, height, 5);

    // Find connected regions
    const labels = new Int32Array(width * height);
    const regions = [];
    let nextLabel = 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (closed[idx] > 0 && labels[idx] === 0) {
                const stats = floodFill(closed, labels, width, height, x, y, nextLabel);
                if (stats.count > 20) {
                    regions.push(stats);
                }
                nextLabel++;
            }
        }
    }

    // Create difference visualization
    const diffImage = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < diffMask.length; i++) {
        const idx = i * 4;
        diffImage[idx] = diffMask[i];
        diffImage[idx + 1] = diffMask[i];
        diffImage[idx + 2] = diffMask[i];
        diffImage[idx + 3] = 255;
    }

    // Create result image (image2 with highlighted differences)
    const resultImage = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        resultImage[idx] = data2[idx];
        resultImage[idx + 1] = data2[idx + 1];
        resultImage[idx + 2] = data2[idx + 2];
        resultImage[idx + 3] = 255;
    }

    // Draw bounding boxes around differences
    for (const region of regions) {
        const x0 = Math.max(0, region.minX - 3);
        const y0 = Math.max(0, region.minY - 3);
        const x1 = Math.min(width - 1, region.maxX + 3);
        const y1 = Math.min(height - 1, region.maxY + 3);

        // Draw rectangle
        for (let x = x0; x <= x1; x++) {
            setPixel(resultImage, width, x, y0, 255, 0, 0);
            setPixel(resultImage, width, x, y0 + 1, 255, 0, 0);
            setPixel(resultImage, width, x, y1, 255, 0, 0);
            setPixel(resultImage, width, x, y1 - 1, 255, 0, 0);
        }
        for (let y = y0; y <= y1; y++) {
            setPixel(resultImage, width, x0, y, 255, 0, 0);
            setPixel(resultImage, width, x0 + 1, y, 255, 0, 0);
            setPixel(resultImage, width, x1, y, 255, 0, 0);
            setPixel(resultImage, width, x1 - 1, y, 255, 0, 0);
        }
    }

    self.postMessage({
        diffImage: new ImageData(diffImage, width, height),
        resultImage: new ImageData(resultImage, width, height),
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

    return { count, minX, maxX, minY, maxY };
}
