self.onmessage = function(e) {
    const { imageData, zoom, zoomIn } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const cx = width / 2, cy = height / 2;
    const scale = zoomIn ? 1 + zoom * 2 : 1 / (1 + zoom * 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Calculate source position based on zoom
            const srcX = cx + (x - cx) / scale;
            const srcY = cy + (y - cy) / scale;

            const dstIdx = (y * width + x) * 4;

            if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
                // Bilinear interpolation
                const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
                const x1 = x0 + 1, y1 = y0 + 1;
                const fx = srcX - x0, fy = srcY - y0;

                for (let c = 0; c < 3; c++) {
                    const v00 = data[(y0 * width + x0) * 4 + c];
                    const v10 = data[(y0 * width + x1) * 4 + c];
                    const v01 = data[(y1 * width + x0) * 4 + c];
                    const v11 = data[(y1 * width + x1) * 4 + c];

                    output[dstIdx + c] = (1 - fx) * (1 - fy) * v00 +
                                          fx * (1 - fy) * v10 +
                                          (1 - fx) * fy * v01 +
                                          fx * fy * v11;
                }
                output[dstIdx + 3] = 255;
            } else {
                // Edge fade
                output[dstIdx] = 0;
                output[dstIdx + 1] = 0;
                output[dstIdx + 2] = 0;
                output[dstIdx + 3] = 255;
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
