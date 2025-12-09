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

        // 2. Edge Detection (Sobel Magnitude)
        const edges = new Uint8Array(width * height);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
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

                const mag = Math.sqrt(gx*gx + gy*gy);
                edges[y*width + x] = mag > 50 ? 255 : 0; // Threshold edges
            }
        }

        // 3. Morphological Dilation (to connect letters into words/lines)
        // Text is usually horizontally close. Use a wider kernel.
        // Kernel: 11x3
        const dilated = morphDilate(edges, width, height, 11, 3);

        // 4. Find Connected Components
        const boxes = findComponents(dilated, width, height);

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

function morphDilate(src, width, height, kw, kh) {
    const dest = new Uint8Array(width * height);
    const hw = Math.floor(kw / 2);
    const hh = Math.floor(kh / 2);

    // Optimization: separable dilation or just brute force for now since image usually small enough in examples
    // Or we can assume 0/255 and just check if any neighbor is 255

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let maxVal = 0;

            // Check neighbors
            // Bounding box for kernel
            const yStart = Math.max(0, y - hh);
            const yEnd = Math.min(height - 1, y + hh);
            const xStart = Math.max(0, x - hw);
            const xEnd = Math.min(width - 1, x + hw);

            for (let ky = yStart; ky <= yEnd; ky++) {
                for (let kx = xStart; kx <= xEnd; kx++) {
                    if (src[ky * width + kx] === 255) {
                        maxVal = 255;
                        break;
                    }
                }
                if (maxVal === 255) break;
            }

            dest[y * width + x] = maxVal;
        }
    }
    return dest;
}

function findComponents(src, width, height) {
    const visited = new Uint8Array(width * height);
    const boxes = [];
    const minArea = 100; // Minimum box area

    for (let y = 0; y < height; y+=2) {
        for (let x = 0; x < width; x+=2) {
            const idx = y * width + x;
            if (src[idx] === 255 && visited[idx] === 0) {
                const box = floodFill(src, visited, width, height, x, y);

                // Filter boxes
                const area = box.width * box.height;
                // Aspect ratio check? Text lines are usually wider than tall
                if (area > minArea && box.width > 10 && box.height > 8) {
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

    // Iterative flood fill
    while (stack.length > 0) {
        const y = stack.pop();
        const x = stack.pop();

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        const idx = y * width + x;

        // 4-connectivity
        const dirs = [0, 1, 0, -1, 1, 0, -1, 0];
        for (let i = 0; i < 8; i+=2) {
            const nx = x + dirs[i];
            const ny = y + dirs[i+1];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (src[nIdx] === 255 && visited[nIdx] === 0) {
                    visited[nIdx] = 1;
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
