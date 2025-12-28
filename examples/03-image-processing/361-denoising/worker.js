self.onmessage = function(e) {
    const { imageData, strength, searchSize } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const h = strength * strength;
    const patchSize = 3;
    const halfPatch = Math.floor(patchSize / 2);
    const halfSearch = Math.floor(searchSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let totalWeight = 0;
            let sumR = 0, sumG = 0, sumB = 0;

            for (let sy = -halfSearch; sy <= halfSearch; sy++) {
                for (let sx = -halfSearch; sx <= halfSearch; sx++) {
                    const nx = x + sx, ny = y + sy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                    let dist = 0;
                    for (let py = -halfPatch; py <= halfPatch; py++) {
                        for (let px = -halfPatch; px <= halfPatch; px++) {
                            const x1 = Math.min(Math.max(x + px, 0), width - 1);
                            const y1 = Math.min(Math.max(y + py, 0), height - 1);
                            const x2 = Math.min(Math.max(nx + px, 0), width - 1);
                            const y2 = Math.min(Math.max(ny + py, 0), height - 1);
                            const i1 = (y1 * width + x1) * 4;
                            const i2 = (y2 * width + x2) * 4;
                            for (let c = 0; c < 3; c++) {
                                const d = data[i1 + c] - data[i2 + c];
                                dist += d * d;
                            }
                        }
                    }

                    const weight = Math.exp(-dist / h);
                    totalWeight += weight;
                    const idx = (ny * width + nx) * 4;
                    sumR += weight * data[idx];
                    sumG += weight * data[idx + 1];
                    sumB += weight * data[idx + 2];
                }
            }

            const outIdx = (y * width + x) * 4;
            output[outIdx] = sumR / totalWeight;
            output[outIdx + 1] = sumG / totalWeight;
            output[outIdx + 2] = sumB / totalWeight;
            output[outIdx + 3] = 255;
        }
        if (y % 10 === 0) self.postMessage({ type: 'progress', progress: y / height });
    }

    self.postMessage({ type: 'result', imageData: new ImageData(output, width, height) });
};
