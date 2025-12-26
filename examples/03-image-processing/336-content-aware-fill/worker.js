function findBestPatch(data, width, height, mask, x, y, patchSize) {
    let bestX = 0, bestY = 0, bestDiff = Infinity;
    const halfPatch = Math.floor(patchSize / 2);

    for (let sy = halfPatch; sy < height - halfPatch; sy += 3) {
        for (let sx = halfPatch; sx < width - halfPatch; sx += 3) {
            if (mask[sy * width + sx] === 1) continue;

            let diff = 0, count = 0;
            for (let py = -halfPatch; py <= halfPatch; py++) {
                for (let px = -halfPatch; px <= halfPatch; px++) {
                    const tx = x + px, ty = y + py;
                    if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue;
                    if (mask[ty * width + tx] === 1) continue;

                    const srcIdx = ((sy + py) * width + (sx + px)) * 4;
                    const tgtIdx = (ty * width + tx) * 4;

                    diff += Math.abs(data[srcIdx] - data[tgtIdx]);
                    diff += Math.abs(data[srcIdx + 1] - data[tgtIdx + 1]);
                    diff += Math.abs(data[srcIdx + 2] - data[tgtIdx + 2]);
                    count++;
                }
            }

            if (count > 0 && diff / count < bestDiff) {
                bestDiff = diff / count;
                bestX = sx;
                bestY = sy;
            }
        }
    }

    return { x: bestX, y: bestY };
}

self.onmessage = function(e) {
    const { imageData, mask } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const patchSize = 7;
    const halfPatch = Math.floor(patchSize / 2);

    // Simple patch-based filling
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mask[y * width + x] !== 1) continue;

            const best = findBestPatch(data, width, height, mask, x, y, patchSize);
            const srcIdx = (best.y * width + best.x) * 4;
            const dstIdx = (y * width + x) * 4;

            output[dstIdx] = data[srcIdx];
            output[dstIdx + 1] = data[srcIdx + 1];
            output[dstIdx + 2] = data[srcIdx + 2];
            output[dstIdx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
