self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Apply Sobel edge detection
    const edges = new Uint8Array(width * height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kidx = (ky + 1) * 3 + (kx + 1);
                    gx += gray[idx] * sobelX[kidx];
                    gy += gray[idx] * sobelY[kidx];
                }
            }
            edges[y * width + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
        }
    }

    // Apply threshold and find contours
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < edges.length; i++) {
        binary[i] = edges[i] > threshold ? 255 : 0;
    }

    // Trace contours using Moore-Neighbor tracing
    const output = new Uint8ClampedArray(data.length);
    // Set background to white
    for (let i = 0; i < output.length; i += 4) {
        output[i] = 255;
        output[i + 1] = 255;
        output[i + 2] = 255;
        output[i + 3] = 255;
    }

    // Draw contours in different colors
    const colors = [
        [255, 0, 0], [0, 255, 0], [0, 0, 255],
        [255, 255, 0], [255, 0, 255], [0, 255, 255]
    ];

    let colorIdx = 0;
    const visited = new Uint8Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (binary[idx] === 255 && !visited[idx]) {
                // Found a contour point, trace it
                const color = colors[colorIdx % colors.length];
                colorIdx++;

                // Simple contour following
                let cx = x, cy = y;
                const startX = x, startY = y;
                let count = 0;

                do {
                    const cidx = cy * width + cx;
                    visited[cidx] = 1;

                    const oidx = cidx * 4;
                    output[oidx] = color[0];
                    output[oidx + 1] = color[1];
                    output[oidx + 2] = color[2];

                    // Find next contour point
                    let found = false;
                    for (let dy = -1; dy <= 1 && !found; dy++) {
                        for (let dx = -1; dx <= 1 && !found; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = cx + dx, ny = cy + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nidx = ny * width + nx;
                                if (binary[nidx] === 255 && !visited[nidx]) {
                                    cx = nx;
                                    cy = ny;
                                    found = true;
                                }
                            }
                        }
                    }

                    if (!found) break;
                    count++;
                } while (count < width * height && !(cx === startX && cy === startY));
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
