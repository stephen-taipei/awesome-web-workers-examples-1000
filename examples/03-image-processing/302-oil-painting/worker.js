self.onmessage = function(e) {
    const { imageData, radius, levels } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const bins = new Array(levels).fill(null).map(() => ({ count: 0, r: 0, g: 0, b: 0 }));

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const sx = Math.min(width - 1, Math.max(0, x + dx));
                    const sy = Math.min(height - 1, Math.max(0, y + dy));
                    const idx = (sy * width + sx) * 4;

                    const intensity = Math.floor(((data[idx] + data[idx + 1] + data[idx + 2]) / 3) * levels / 256);
                    const bin = bins[Math.min(levels - 1, intensity)];
                    bin.count++;
                    bin.r += data[idx];
                    bin.g += data[idx + 1];
                    bin.b += data[idx + 2];
                }
            }

            // Find most frequent intensity bin
            let maxBin = bins[0];
            for (const bin of bins) {
                if (bin.count > maxBin.count) maxBin = bin;
            }

            const idx = (y * width + x) * 4;
            if (maxBin.count > 0) {
                output[idx] = maxBin.r / maxBin.count;
                output[idx + 1] = maxBin.g / maxBin.count;
                output[idx + 2] = maxBin.b / maxBin.count;
            }
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
