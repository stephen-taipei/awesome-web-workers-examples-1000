self.onmessage = function(e) {
    const { imageData, targetWidth, targetHeight } = e.data;
    const startTime = performance.now();

    const srcWidth = imageData.width;
    const srcHeight = imageData.height;
    const srcData = imageData.data;

    const dstData = new Uint8ClampedArray(targetWidth * targetHeight * 4);

    const xRatio = srcWidth / targetWidth;
    const yRatio = srcHeight / targetHeight;

    // Nearest neighbor is simple loop
    for (let y = 0; y < targetHeight; y++) {
        // Report progress
        if (y % 100 === 0) {
            self.postMessage({ type: 'progress', progress: (y / targetHeight) * 100 });
        }

        const srcY = Math.floor(y * yRatio);
        const yOffset = srcY * srcWidth;
        const dstYOffset = y * targetWidth;

        for (let x = 0; x < targetWidth; x++) {
            const srcX = Math.floor(x * xRatio);

            const srcIndex = (yOffset + srcX) * 4;
            const dstIndex = (dstYOffset + x) * 4;

            // Direct copy
            dstData[dstIndex] = srcData[srcIndex];
            dstData[dstIndex+1] = srcData[srcIndex+1];
            dstData[dstIndex+2] = srcData[srcIndex+2];
            dstData[dstIndex+3] = srcData[srcIndex+3];
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(dstData, targetWidth, targetHeight),
        duration: Math.round(endTime - startTime)
    });
};
