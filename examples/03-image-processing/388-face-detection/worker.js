self.onmessage = function(e) {
    const { imageData, sensitivity } = e.data;
    const { width, height, data } = imageData;

    // Skin detection in YCbCr color space
    const skinMask = new Uint8Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];

        // Convert to YCbCr
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Skin color range in YCbCr
        const isSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);

        skinMask[i / 4] = isSkin ? 255 : 0;
    }

    // Morphological closing to fill holes
    const closed = morphClose(skinMask, width, height, 3);

    // Find connected skin regions
    const labels = new Int32Array(width * height);
    const regionStats = [];
    let nextLabel = 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (closed[idx] > 0 && labels[idx] === 0) {
                const stats = floodFill(closed, labels, width, height, x, y, nextLabel);
                regionStats.push(stats);
                nextLabel++;
            }
        }
    }

    // Filter regions by size and aspect ratio (face-like)
    const minArea = (width * height) * (sensitivity / 100) * 0.001;
    const faces = [];

    for (const stats of regionStats) {
        if (stats.count < minArea) continue;

        const aspectRatio = stats.width / stats.height;
        // Face aspect ratio is typically between 0.6 and 1.0
        if (aspectRatio >= 0.5 && aspectRatio <= 1.2) {
            // Check if region is roughly elliptical (face-like)
            const expectedArea = Math.PI * (stats.width / 2) * (stats.height / 2) * 0.5;
            if (stats.count > expectedArea * 0.3) {
                faces.push(stats);
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw face rectangles
    for (const face of faces) {
        const padding = 5;
        const x0 = Math.max(0, face.minX - padding);
        const y0 = Math.max(0, face.minY - padding);
        const x1 = Math.min(width - 1, face.maxX + padding);
        const y1 = Math.min(height - 1, face.maxY + padding);

        // Draw rectangle
        for (let x = x0; x <= x1; x++) {
            drawPixel(output, width, x, y0, 0, 255, 0);
            drawPixel(output, width, x, y0 + 1, 0, 255, 0);
            drawPixel(output, width, x, y1, 0, 255, 0);
            drawPixel(output, width, x, y1 - 1, 0, 255, 0);
        }
        for (let y = y0; y <= y1; y++) {
            drawPixel(output, width, x0, y, 0, 255, 0);
            drawPixel(output, width, x0 + 1, y, 0, 255, 0);
            drawPixel(output, width, x1, y, 0, 255, 0);
            drawPixel(output, width, x1 - 1, y, 0, 255, 0);
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        faces: faces.length
    });
};

function drawPixel(data, width, x, y, r, g, b) {
    const idx = (y * width + x) * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
}

function morphClose(mask, width, height, size) {
    // Dilate then erode
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

    return {
        label, count,
        minX, maxX, minY, maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}
