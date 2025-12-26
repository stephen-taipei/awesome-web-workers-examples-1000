self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const radius = 5;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Calculate local mean
            let sum = 0, count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const sx = Math.min(width - 1, Math.max(0, x + dx));
                    const sy = Math.min(height - 1, Math.max(0, y + dy));
                    const idx = (sy * width + sx) * 4;
                    sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    count++;
                }
            }
            const localMean = sum / count;

            const idx = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
                const val = data[idx + c];
                const diff = val - localMean;
                output[idx + c] = Math.max(0, Math.min(255, val + diff * strength));
            }
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
