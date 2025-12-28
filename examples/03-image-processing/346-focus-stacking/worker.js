function calculateLaplacian(data, width, height, x, y) {
    const idx = (y, x) => Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x));

    let sum = 0;
    for (let c = 0; c < 3; c++) {
        const center = data[idx(y, x) * 4 + c];
        const laplacian =
            data[idx(y - 1, x) * 4 + c] +
            data[idx(y + 1, x) * 4 + c] +
            data[idx(y, x - 1) * 4 + c] +
            data[idx(y, x + 1) * 4 + c] -
            4 * center;
        sum += Math.abs(laplacian);
    }
    return sum / 3;
}

self.onmessage = function(e) {
    const { imageData, sharpnessThreshold, blendRadius } = e.data;
    const { width, height, data } = imageData;

    // Calculate sharpness map using Laplacian
    const sharpness = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            sharpness[y * width + x] = calculateLaplacian(data, width, height, x, y);
        }
    }

    // Enhance sharp areas (simulate focus stacking effect)
    const output = new Uint8ClampedArray(data.length);
    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const sharp = sharpness[y * width + x];

            if (sharp > sharpnessThreshold) {
                // Apply sharpening to focused areas
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    let ki = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const ny = Math.max(0, Math.min(height - 1, y + ky));
                            const nx = Math.max(0, Math.min(width - 1, x + kx));
                            sum += data[(ny * width + nx) * 4 + c] * kernel[ki++];
                        }
                    }
                    output[idx + c] = Math.max(0, Math.min(255, sum));
                }
            } else {
                // Keep original for less sharp areas
                output[idx] = data[idx];
                output[idx + 1] = data[idx + 1];
                output[idx + 2] = data[idx + 2];
            }
            output[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
