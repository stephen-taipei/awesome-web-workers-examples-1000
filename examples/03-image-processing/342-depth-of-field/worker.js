function createBlurredVersions(data, width, height, maxRadius) {
    const versions = [new Uint8ClampedArray(data)];

    for (let r = 1; r <= maxRadius; r += 2) {
        const prev = versions[versions.length - 1];
        const blurred = new Uint8ClampedArray(prev.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let rSum = 0, gSum = 0, bSum = 0, count = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const ny = Math.max(0, Math.min(height - 1, y + ky));
                        const nx = Math.max(0, Math.min(width - 1, x + kx));
                        const idx = (ny * width + nx) * 4;
                        rSum += prev[idx];
                        gSum += prev[idx + 1];
                        bSum += prev[idx + 2];
                        count++;
                    }
                }

                const idx = (y * width + x) * 4;
                blurred[idx] = rSum / count;
                blurred[idx + 1] = gSum / count;
                blurred[idx + 2] = bSum / count;
                blurred[idx + 3] = 255;
            }
        }

        versions.push(blurred);
    }

    return versions;
}

self.onmessage = function(e) {
    const { imageData, focusPoint, dofRange, blurRadius } = e.data;
    const { width, height, data } = imageData;

    // Create multiple blur levels
    const blurLevels = createBlurredVersions(data, width, height, blurRadius);
    const numLevels = blurLevels.length;
    const output = new Uint8ClampedArray(data.length);

    const focusY = height * focusPoint;
    const dofPixels = height * dofRange;

    for (let y = 0; y < height; y++) {
        // Calculate blur level based on distance from focus plane
        const distFromFocus = Math.abs(y - focusY);
        let blurLevel = 0;

        if (distFromFocus > dofPixels / 2) {
            blurLevel = Math.min(numLevels - 1,
                Math.floor((distFromFocus - dofPixels / 2) / (height / 2 - dofPixels / 2) * numLevels));
        }

        const source = blurLevels[blurLevel];

        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            output[idx] = source[idx];
            output[idx + 1] = source[idx + 1];
            output[idx + 2] = source[idx + 2];
            output[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
