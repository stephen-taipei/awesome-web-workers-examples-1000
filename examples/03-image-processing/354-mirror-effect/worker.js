self.onmessage = function(e) {
    const { imageData, mode } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            let srcX = x;
            let srcY = y;

            switch (mode) {
                case 'left-to-right':
                    if (x >= centerX) srcX = width - 1 - x;
                    break;
                case 'right-to-left':
                    if (x < centerX) srcX = width - 1 - x;
                    break;
                case 'top-to-bottom':
                    if (y >= centerY) srcY = height - 1 - y;
                    break;
                case 'bottom-to-top':
                    if (y < centerY) srcY = height - 1 - y;
                    break;
                case 'quad':
                    if (x >= centerX) srcX = width - 1 - x;
                    if (y >= centerY) srcY = height - 1 - y;
                    break;
            }

            const srcIdx = (srcY * width + srcX) * 4;
            const dstIdx = (y * width + x) * 4;

            dstData[dstIdx] = srcData[srcIdx];
            dstData[dstIdx + 1] = srcData[srcIdx + 1];
            dstData[dstIdx + 2] = srcData[srcIdx + 2];
            dstData[dstIdx + 3] = srcData[srcIdx + 3];
        }

        if (y % 100 === 0) {
            self.postMessage({ type: 'progress', progress: (y / height) * 100 });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        imageData: resultImageData,
        time: endTime - startTime
    });
};
