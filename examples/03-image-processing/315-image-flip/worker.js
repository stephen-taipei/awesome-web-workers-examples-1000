self.onmessage = function(e) {
    const { imageData, mode } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new buffer, or modify in place?
    // We can modify in place if careful, but simpler to create new buffer.
    const dstData = new Uint8ClampedArray(width * height * 4);

    // Direct pixel mapping

    for (let y = 0; y < height; y++) {
        // Progress update
        if (y % 100 === 0) {
            self.postMessage({ type: 'progress', progress: (y / height) * 100 });
        }

        for (let x = 0; x < width; x++) {
            let srcX = x;
            let srcY = y;

            if (mode === 'horizontal' || mode === 'both') {
                srcX = width - 1 - x;
            }
            if (mode === 'vertical' || mode === 'both') {
                srcY = height - 1 - y;
            }

            const srcIdx = (srcY * width + srcX) * 4;
            const dstIdx = (y * width + x) * 4;

            dstData[dstIdx] = srcData[srcIdx];
            dstData[dstIdx+1] = srcData[srcIdx+1];
            dstData[dstIdx+2] = srcData[srcIdx+2];
            dstData[dstIdx+3] = srcData[srcIdx+3];
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(dstData, width, height),
        duration: Math.round(endTime - startTime)
    });
};
