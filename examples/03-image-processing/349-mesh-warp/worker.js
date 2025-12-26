function bilinearInterpolate(data, width, height, x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
    const fx = x - x0, fy = y - y0;

    const result = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
        const v00 = data[(y0 * width + x0) * 4 + c];
        const v10 = data[(y0 * width + x1) * 4 + c];
        const v01 = data[(y1 * width + x0) * 4 + c];
        const v11 = data[(y1 * width + x1) * 4 + c];
        result[c] = (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 +
                    (1 - fx) * fy * v01 + fx * fy * v11;
    }
    return result;
}

self.onmessage = function(e) {
    const { imageData, gridSize, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Create random mesh displacements
    const mesh = [];
    for (let gy = 0; gy <= gridSize; gy++) {
        mesh[gy] = [];
        for (let gx = 0; gx <= gridSize; gx++) {
            mesh[gy][gx] = {
                dx: (Math.random() - 0.5) * width / gridSize * strength,
                dy: (Math.random() - 0.5) * height / gridSize * strength
            };
        }
    }

    const cellW = width / gridSize;
    const cellH = height / gridSize;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const gx = x / cellW;
            const gy = y / cellH;
            const gx0 = Math.floor(gx), gy0 = Math.floor(gy);
            const gx1 = Math.min(gx0 + 1, gridSize), gy1 = Math.min(gy0 + 1, gridSize);
            const fx = gx - gx0, fy = gy - gy0;

            // Bilinear interpolation of mesh displacements
            const dx = (1 - fx) * (1 - fy) * mesh[gy0][gx0].dx +
                       fx * (1 - fy) * mesh[gy0][gx1].dx +
                       (1 - fx) * fy * mesh[gy1][gx0].dx +
                       fx * fy * mesh[gy1][gx1].dx;
            const dy = (1 - fx) * (1 - fy) * mesh[gy0][gx0].dy +
                       fx * (1 - fy) * mesh[gy0][gx1].dy +
                       (1 - fx) * fy * mesh[gy1][gx0].dy +
                       fx * fy * mesh[gy1][gx1].dy;

            const srcX = Math.max(0, Math.min(width - 1, x + dx));
            const srcY = Math.max(0, Math.min(height - 1, y + dy));

            const colors = bilinearInterpolate(data, width, height, srcX, srcY);
            const dstIdx = (y * width + x) * 4;
            output[dstIdx] = colors[0];
            output[dstIdx + 1] = colors[1];
            output[dstIdx + 2] = colors[2];
            output[dstIdx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
