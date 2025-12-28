function bicubicInterpolate(p, x) {
    return p[1] + 0.5 * x * (p[2] - p[0] + x * (2.0 * p[0] - 5.0 * p[1] + 4.0 * p[2] - p[3] + x * (3.0 * (p[1] - p[2]) + p[3] - p[0])));
}

function getPixel(data, width, height, x, y, c) {
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    return data[(y * width + x) * 4 + c];
}

self.onmessage = function(e) {
    const { imageData, scale, sharp } = e.data;
    const { width, height, data } = imageData;
    const newWidth = width * scale;
    const newHeight = height * scale;
    const output = new Uint8ClampedArray(newWidth * newHeight * 4);

    // Bicubic interpolation for upscaling
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const srcX = x / scale;
            const srcY = y / scale;
            const ix = Math.floor(srcX);
            const iy = Math.floor(srcY);
            const fx = srcX - ix;
            const fy = srcY - iy;

            const dstIdx = (y * newWidth + x) * 4;

            for (let c = 0; c < 3; c++) {
                const rows = [];
                for (let j = -1; j <= 2; j++) {
                    const cols = [];
                    for (let i = -1; i <= 2; i++) {
                        cols.push(getPixel(data, width, height, ix + i, iy + j, c));
                    }
                    rows.push(bicubicInterpolate(cols, fx));
                }
                output[dstIdx + c] = Math.max(0, Math.min(255, bicubicInterpolate(rows, fy)));
            }
            output[dstIdx + 3] = 255;
        }
    }

    // Apply sharpening
    if (sharp > 0) {
        const sharpened = new Uint8ClampedArray(output);
        const kernel = [0, -sharp, 0, -sharp, 1 + 4 * sharp, -sharp, 0, -sharp, 0];

        for (let y = 1; y < newHeight - 1; y++) {
            for (let x = 1; x < newWidth - 1; x++) {
                const idx = (y * newWidth + x) * 4;
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    let ki = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            sum += output[((y + ky) * newWidth + (x + kx)) * 4 + c] * kernel[ki++];
                        }
                    }
                    sharpened[idx + c] = Math.max(0, Math.min(255, sum));
                }
            }
        }
        self.postMessage({ imageData: new ImageData(sharpened, newWidth, newHeight), newWidth, newHeight });
    } else {
        self.postMessage({ imageData: new ImageData(output, newWidth, newHeight), newWidth, newHeight });
    }
};
