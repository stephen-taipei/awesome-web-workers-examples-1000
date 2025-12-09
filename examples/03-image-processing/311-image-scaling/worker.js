self.onmessage = function(e) {
    const { imageData, targetWidth, targetHeight } = e.data;
    const startTime = performance.now();

    const srcWidth = imageData.width;
    const srcHeight = imageData.height;
    const srcData = imageData.data;

    const dstData = new Uint8ClampedArray(targetWidth * targetHeight * 4);

    // Bilinear Interpolation
    // Map dst(x, y) to src(u, v)
    // ratioX = srcWidth / targetWidth
    // ratioY = srcHeight / targetHeight

    // Optimization: precompute ratios
    // To align centers, use (srcWidth - 1) / (targetWidth - 1)? Or just scaling factor.
    // Standard scaling: u = x * (srcWidth / targetWidth)

    const xRatio = srcWidth / targetWidth;
    const yRatio = srcHeight / targetHeight;

    // Process row by row
    for (let y = 0; y < targetHeight; y++) {

        // Report progress every few rows
        if (y % 50 === 0) {
            self.postMessage({ type: 'progress', progress: (y / targetHeight) * 100 });
        }

        // Map y to source coordinate
        // Center alignment: (y + 0.5) * yRatio - 0.5
        // Or simple: y * yRatio
        const srcY = y * yRatio;
        const y1 = Math.floor(srcY);
        const y2 = Math.min(y1 + 1, srcHeight - 1);
        const dy = srcY - y1;
        const one_minus_dy = 1 - dy;

        for (let x = 0; x < targetWidth; x++) {
            const srcX = x * xRatio;
            const x1 = Math.floor(srcX);
            const x2 = Math.min(x1 + 1, srcWidth - 1);
            const dx = srcX - x1;
            const one_minus_dx = 1 - dx;

            // Weights
            const w1 = one_minus_dx * one_minus_dy;
            const w2 = dx * one_minus_dy;
            const w3 = one_minus_dx * dy;
            const w4 = dx * dy;

            // Source indices
            const i1 = (y1 * srcWidth + x1) * 4;
            const i2 = (y1 * srcWidth + x2) * 4;
            const i3 = (y2 * srcWidth + x1) * 4;
            const i4 = (y2 * srcWidth + x2) * 4;

            const dstIndex = (y * targetWidth + x) * 4;

            // R
            dstData[dstIndex] = w1 * srcData[i1] + w2 * srcData[i2] + w3 * srcData[i3] + w4 * srcData[i4];
            // G
            dstData[dstIndex+1] = w1 * srcData[i1+1] + w2 * srcData[i2+1] + w3 * srcData[i3+1] + w4 * srcData[i4+1];
            // B
            dstData[dstIndex+2] = w1 * srcData[i1+2] + w2 * srcData[i2+2] + w3 * srcData[i3+2] + w4 * srcData[i4+2];
            // A
            dstData[dstIndex+3] = w1 * srcData[i1+3] + w2 * srcData[i2+3] + w3 * srcData[i3+3] + w4 * srcData[i4+3];
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(dstData, targetWidth, targetHeight),
        duration: Math.round(endTime - startTime)
    });
};
