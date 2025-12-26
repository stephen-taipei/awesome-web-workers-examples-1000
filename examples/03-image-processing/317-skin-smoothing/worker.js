function isSkinTone(r, g, b) {
    // Simple skin detection
    return r > 95 && g > 40 && b > 20 &&
           r > g && r > b &&
           Math.abs(r - g) > 15 &&
           r - g > 15;
}

self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const radius = Math.ceil(3 * strength);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            if (!isSkinTone(data[idx], data[idx + 1], data[idx + 2])) continue;

            let r = 0, g = 0, b = 0, count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const sx = Math.min(width - 1, Math.max(0, x + dx));
                    const sy = Math.min(height - 1, Math.max(0, y + dy));
                    const sIdx = (sy * width + sx) * 4;
                    r += data[sIdx];
                    g += data[sIdx + 1];
                    b += data[sIdx + 2];
                    count++;
                }
            }

            output[idx] = data[idx] + (r / count - data[idx]) * strength;
            output[idx + 1] = data[idx + 1] + (g / count - data[idx + 1]) * strength;
            output[idx + 2] = data[idx + 2] + (b / count - data[idx + 2]) * strength;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
