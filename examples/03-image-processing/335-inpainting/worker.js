self.onmessage = function(e) {
    const { imageData, mask } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    // Simple inpainting using neighboring pixel averaging
    const iterations = 50;

    for (let iter = 0; iter < iterations; iter++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mask[y * width + x] === 0) continue;

                const idx = (y * width + x) * 4;
                let rSum = 0, gSum = 0, bSum = 0, count = 0;

                // Sample from neighbors
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                        const nIdx = (ny * width + nx) * 4;
                        const weight = mask[ny * width + nx] === 0 ? 2 : 1;
                        rSum += output[nIdx] * weight;
                        gSum += output[nIdx + 1] * weight;
                        bSum += output[nIdx + 2] * weight;
                        count += weight;
                    }
                }

                if (count > 0) {
                    output[idx] = rSum / count;
                    output[idx + 1] = gSum / count;
                    output[idx + 2] = bSum / count;
                }
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
