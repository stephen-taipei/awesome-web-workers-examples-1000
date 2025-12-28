function createCircleKernel(radius) {
    const size = radius * 2 + 1;
    const kernel = [];
    const center = radius;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Create ring-like bokeh shape
            if (dist <= radius && dist >= radius * 0.7) {
                kernel.push({ x: dx, y: dy, weight: 1 });
            } else if (dist < radius * 0.7) {
                kernel.push({ x: dx, y: dy, weight: 0.5 });
            }
        }
    }
    return kernel;
}

self.onmessage = function(e) {
    const { imageData, bokehSize, threshold } = e.data;
    const { width, height, data } = imageData;
    const output = new Float32Array(width * height * 4);
    const weights = new Float32Array(width * height);

    // Initialize output
    for (let i = 0; i < data.length; i++) output[i] = 0;

    const kernel = createCircleKernel(bokehSize);

    // Find bright spots and spread them
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

            if (brightness > threshold) {
                // Spread this bright pixel using bokeh kernel
                const intensity = (brightness - threshold) / (255 - threshold);

                for (const k of kernel) {
                    const nx = x + k.x;
                    const ny = y + k.y;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                    const nIdx = (ny * width + nx) * 4;
                    const w = k.weight * intensity;

                    output[nIdx] += data[idx] * w;
                    output[nIdx + 1] += data[idx + 1] * w;
                    output[nIdx + 2] += data[idx + 2] * w;
                    weights[ny * width + nx] += w;
                }
            }
        }
    }

    // Combine with original
    const result = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const w = weights[i / 4];
        if (w > 0) {
            result[i] = Math.min(255, data[i] * 0.5 + output[i] / w * 0.8);
            result[i + 1] = Math.min(255, data[i + 1] * 0.5 + output[i + 1] / w * 0.8);
            result[i + 2] = Math.min(255, data[i + 2] * 0.5 + output[i + 2] / w * 0.8);
        } else {
            result[i] = data[i];
            result[i + 1] = data[i + 1];
            result[i + 2] = data[i + 2];
        }
        result[i + 3] = 255;
    }

    self.postMessage({ imageData: new ImageData(result, width, height) });
};
