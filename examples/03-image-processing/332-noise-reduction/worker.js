self.onmessage = function(e) {
    const { imageData, strength, radius } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const h = strength * 10;

    // Non-local means denoising (simplified)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let rSum = 0, gSum = 0, bSum = 0, wSum = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const ny = Math.max(0, Math.min(height - 1, y + dy));
                    const nx = Math.max(0, Math.min(width - 1, x + dx));
                    const nIdx = (ny * width + nx) * 4;

                    // Calculate weight based on color similarity
                    const dr = data[idx] - data[nIdx];
                    const dg = data[idx + 1] - data[nIdx + 1];
                    const db = data[idx + 2] - data[nIdx + 2];
                    const dist = dr * dr + dg * dg + db * db;
                    const weight = Math.exp(-dist / (h * h));

                    rSum += data[nIdx] * weight;
                    gSum += data[nIdx + 1] * weight;
                    bSum += data[nIdx + 2] * weight;
                    wSum += weight;
                }
            }

            output[idx] = rSum / wSum;
            output[idx + 1] = gSum / wSum;
            output[idx + 2] = bSum / wSum;
            output[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
