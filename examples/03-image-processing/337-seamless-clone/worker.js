self.onmessage = function(e) {
    const { imageData, radius, blend } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    // Simulate seamless cloning with gradient blending
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                const idx = (y * width + x) * 4;

                // Feathered edge for seamless blending
                let factor = 1;
                if (dist > radius * 0.7) {
                    factor = 1 - (dist - radius * 0.7) / (radius * 0.3);
                }

                // Apply color shift based on surrounding average
                const avgR = getRegionAvg(data, width, height, x, y, 5, 0);
                const avgG = getRegionAvg(data, width, height, x, y, 5, 1);
                const avgB = getRegionAvg(data, width, height, x, y, 5, 2);

                output[idx] = data[idx] * (1 - blend * factor) + avgR * blend * factor;
                output[idx + 1] = data[idx + 1] * (1 - blend * factor) + avgG * blend * factor;
                output[idx + 2] = data[idx + 2] * (1 - blend * factor) + avgB * blend * factor;
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};

function getRegionAvg(data, width, height, cx, cy, size, channel) {
    let sum = 0, count = 0;
    for (let y = cy - size; y <= cy + size; y++) {
        for (let x = cx - size; x <= cx + size; x++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                sum += data[(y * width + x) * 4 + channel];
                count++;
            }
        }
    }
    return count > 0 ? sum / count : 0;
}
