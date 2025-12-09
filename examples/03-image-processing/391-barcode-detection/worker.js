self.onmessage = function(e) {
    const { imageData } = e.data;
    const startTime = performance.now();

    try {
        const { width, height, data } = imageData;

        // 1. Grayscale
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        // 2. Compute Sobel X and Sobel Y
        // We want to detect regions with high vertical gradients (bars) and low horizontal gradients.
        // Actually for 1D barcode, vertical edges are strong.
        // Standard method: abs(SobelX) - abs(SobelY)

        const grad = new Int16Array(width * height); // can be negative intermediate
        const output = new Uint8Array(width * height);

        // Sobel Kernels
        // Gx: -1 0 1, -2 0 2, -1 0 1
        // Gy: -1 -2 -1, 0 0 0, 1 2 1

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;

                const p00 = gray[(y-1)*width + (x-1)];
                const p01 = gray[(y-1)*width + x];
                const p02 = gray[(y-1)*width + (x+1)];
                const p10 = gray[y*width + (x-1)];
                const p12 = gray[y*width + (x+1)];
                const p20 = gray[(y+1)*width + (x-1)];
                const p21 = gray[(y+1)*width + x];
                const p22 = gray[(y+1)*width + (x+1)];

                const gx = (p02 + 2*p12 + p22) - (p00 + 2*p10 + p20);
                const gy = (p20 + 2*p21 + p22) - (p00 + 2*p01 + p02);

                // We focus on vertical edges (Gx) and suppress horizontal edges (Gy) for barcodes
                // Simple difference
                let d = Math.abs(gx) - Math.abs(gy);
                if (d < 0) d = 0;
                if (d > 255) d = 255;

                output[idx] = d;
            }
        }

        // 3. Blur (Low pass filter) to connect gaps
        // Use a simple Box Blur
        const blurred = boxBlur(output, width, height, 9); // Radius 9 roughly

        // 4. Threshold (Otsu or simple high threshold)
        // Let's use a simple high threshold for now
        const thresholded = new Uint8Array(width * height);
        const thresh = 100; // Empirical
        for (let i = 0; i < width * height; i++) {
            thresholded[i] = blurred[i] > thresh ? 255 : 0;
        }

        // 5. Morphological Closing (Dilate -> Erode)
        // Specifically, horizontal closing to connect bars
        // Kernel: rectangular [21, 7]
        const closed = morphClose(thresholded, width, height, 21, 7);

        // 6. Find Connected Components (Bounding Boxes)
        const boxes = findComponents(closed, width, height);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                boxes: boxes,
                time: Math.round(endTime - startTime)
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function boxBlur(src, width, height, radius) {
    const dest = new Uint8Array(width * height);
    // Simple horizontal then vertical blur
    // Approximate with single pass average for speed/simplicity code here,
    // or implementation of separable blur.

    // Simplest: moving average
    // Horizontal
    const temp = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        let sum = 0;
        let count = 0;
        // Init window
        for(let x=0; x<radius && x<width; x++) {
             sum += src[y*width+x]; count++;
        }

        for (let x = 0; x < width; x++) {
            if (x + radius < width) {
                sum += src[y*width + x + radius];
                count++;
            }
            if (x - radius - 1 >= 0) {
                sum -= src[y*width + x - radius - 1];
                count--;
            }
            temp[y*width+x] = sum / count;
        }
    }

    // Vertical
    for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for(let y=0; y<radius && y<height; y++) {
             sum += temp[y*width+x]; count++;
        }
        for (let y = 0; y < height; y++) {
             if (y + radius < height) {
                sum += temp[(y+radius)*width + x];
                count++;
            }
            if (y - radius - 1 >= 0) {
                sum -= temp[(y-radius-1)*width + x];
                count--;
            }
            dest[y*width+x] = sum / count;
        }
    }
    return dest;
}

function morphClose(src, width, height, kw, kh) {
    // Dilate
    const dilated = morphOp(src, width, height, kw, kh, 'dilate');
    // Erode
    const eroded = morphOp(dilated, width, height, kw, kh, 'erode');
    return eroded;
}

function morphOp(src, width, height, kw, kh, op) {
    const dest = new Uint8Array(width * height);
    const hw = Math.floor(kw / 2);
    const hh = Math.floor(kh / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let val = op === 'dilate' ? 0 : 255;

            // Simplified: check boundaries only roughly or sample center and corners if kernel large
            // Full kernel scan
            for (let ky = -hh; ky <= hh; ky++) {
                const py = y + ky;
                if (py < 0 || py >= height) continue;
                for (let kx = -hw; kx <= hw; kx++) {
                    const px = x + kx;
                    if (px < 0 || px >= width) continue;

                    const p = src[py * width + px];
                    if (op === 'dilate') {
                        if (p > val) val = p;
                    } else {
                        if (p < val) val = p;
                    }
                }
            }
            dest[y * width + x] = val;
        }
    }
    return dest;
}

function findComponents(src, width, height) {
    // Simple connected components using disjoint set or flood fill
    // Or just bounding box accumulation for white regions
    // Since we expect large blobs, simple flood fill is fine

    const visited = new Uint8Array(width * height); // 0 = unvisited
    const boxes = [];
    const minArea = width * height * 0.005; // Filter small noise

    for (let y = 0; y < height; y+=4) { // coarse scan
        for (let x = 0; x < width; x+=4) {
            const idx = y * width + x;
            if (src[idx] > 128 && visited[idx] === 0) {
                // Found new component
                const box = floodFill(src, visited, width, height, x, y);
                if (box.width * box.height > minArea) {
                    // Filter by aspect ratio (barcodes are usually wide)
                    // if (box.width > box.height) // loose filter
                    boxes.push(box);
                }
            }
        }
    }
    return boxes;
}

function floodFill(src, visited, width, height, startX, startY) {
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    const stack = [startX, startY];
    visited[startY * width + startX] = 1;

    while (stack.length > 0) {
        const y = stack.pop();
        const x = stack.pop();

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Neighbors
        const dirs = [0, 1, 0, -1, 1, 0, -1, 0];
        for (let i = 0; i < 8; i+=2) {
            const nx = x + dirs[i];
            const ny = y + dirs[i+1];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = ny * width + nx;
                if (src[idx] > 128 && visited[idx] === 0) {
                    visited[idx] = 1;
                    stack.push(nx, ny);
                }
            }
        }
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };
}
