self.onmessage = function(e) {
    const { imageData, intensity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Convert to grayscale first
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Detect edges using Sobel
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = -gray[idx - width - 1] + gray[idx - width + 1]
                     - 2 * gray[idx - 1] + 2 * gray[idx + 1]
                     - gray[idx + width - 1] + gray[idx + width + 1];
            const gy = -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1]
                     + gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];

            const edge = Math.sqrt(gx * gx + gy * gy) * intensity;
            const val = Math.max(0, 255 - edge);

            const outIdx = idx * 4;
            output[outIdx] = val;
            output[outIdx + 1] = val;
            output[outIdx + 2] = val;
            output[outIdx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
