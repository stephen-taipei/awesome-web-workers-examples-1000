function sobelEnergy(data, width, height, edgeWeight) {
    const energy = new Float32Array(width * height);
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gradX = 0, gradY = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    const ki = (ky + 1) * 3 + (kx + 1);
                    gradX += gray * gx[ki];
                    gradY += gray * gy[ki];
                }
            }

            energy[y * width + x] = Math.sqrt(gradX * gradX + gradY * gradY) * (1 + edgeWeight);
        }
    }
    return energy;
}

function seamCarve(data, width, height, energy) {
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
    const { imageData, targetWidthPercent, edgeWeight } = e.data;
    let { width, height } = imageData;
    let data = new Uint8ClampedArray(imageData.data);
    const targetWidth = Math.floor(width * targetWidthPercent / 100);

    while (width > targetWidth) {
        const energy = sobelEnergy(data, width, height, edgeWeight);
        const seam = seamCarve(data, width, height, energy);

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

    self.postMessage({ imageData: new ImageData(data, width, height), newWidth: width, newHeight: height });
};
