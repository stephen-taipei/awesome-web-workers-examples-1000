function calculateEnergy(data, width, height) {
    const energy = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const left = Math.max(0, x - 1);
            const right = Math.min(width - 1, x + 1);
            const top = Math.max(0, y - 1);
            const bottom = Math.min(height - 1, y + 1);

            let dx = 0, dy = 0;
            for (let c = 0; c < 3; c++) {
                dx += Math.abs(data[(y * width + right) * 4 + c] - data[(y * width + left) * 4 + c]);
                dy += Math.abs(data[(bottom * width + x) * 4 + c] - data[(top * width + x) * 4 + c]);
            }
            energy[idx] = dx + dy;
        }
    }
    return energy;
}

function findSeam(energy, width, height) {
    const dp = new Float32Array(energy);

    for (let y = 1; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            let minPrev = dp[(y - 1) * width + x];
            if (x > 0) minPrev = Math.min(minPrev, dp[(y - 1) * width + x - 1]);
            if (x < width - 1) minPrev = Math.min(minPrev, dp[(y - 1) * width + x + 1]);
            dp[idx] = energy[idx] + minPrev;
        }
    }

    // Backtrack
    const seam = new Int32Array(height);
    let minIdx = 0;
    for (let x = 1; x < width; x++) {
        if (dp[(height - 1) * width + x] < dp[(height - 1) * width + minIdx]) minIdx = x;
    }
    seam[height - 1] = minIdx;

    for (let y = height - 2; y >= 0; y--) {
        const prev = seam[y + 1];
        let minX = prev;
        if (prev > 0 && dp[y * width + prev - 1] < dp[y * width + minX]) minX = prev - 1;
        if (prev < width - 1 && dp[y * width + prev + 1] < dp[y * width + minX]) minX = prev + 1;
        seam[y] = minX;
    }

    return seam;
}

self.onmessage = function(e) {
    const { imageData, targetWidth } = e.data;
    let { width, height } = imageData;
    let data = new Uint8ClampedArray(imageData.data);

    while (width > targetWidth) {
        const energy = calculateEnergy(data, width, height);
        const seam = findSeam(energy, width, height);

        const newData = new Uint8ClampedArray((width - 1) * height * 4);
        for (let y = 0; y < height; y++) {
            let newX = 0;
            for (let x = 0; x < width; x++) {
                if (x === seam[y]) continue;
                const srcIdx = (y * width + x) * 4;
                const dstIdx = (y * (width - 1) + newX) * 4;
                newData[dstIdx] = data[srcIdx];
                newData[dstIdx + 1] = data[srcIdx + 1];
                newData[dstIdx + 2] = data[srcIdx + 2];
                newData[dstIdx + 3] = 255;
                newX++;
            }
        }

        data = newData;
        width--;
    }

    self.postMessage({
        imageData: new ImageData(data, width, height),
        newWidth: width,
        newHeight: height
    });
};
