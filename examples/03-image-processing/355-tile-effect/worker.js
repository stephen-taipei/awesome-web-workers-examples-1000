self.onmessage = function(e) {
    const { imageData, tiles } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    // Each tile size
    const tileW = width / tiles;
    const tileH = height / tiles;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            // Map destination coord (x, y) to source coord within a single tile logic
            // Effectively modulo arithmetic scaled up

            // Current tile index
            // const tx = Math.floor(x / tileW);
            // const ty = Math.floor(y / tileH);

            // Normalized coordinate within the tile (0.0 to 1.0)
            const u = (x % tileW) / tileW;
            const v = (y % tileH) / tileH;

            // Map back to full source image size
            const srcX = Math.floor(u * width);
            const srcY = Math.floor(v * height);

            // Clamp
            const clampedSrcX = Math.min(width - 1, Math.max(0, srcX));
            const clampedSrcY = Math.min(height - 1, Math.max(0, srcY));

            const srcIdx = (clampedSrcY * width + clampedSrcX) * 4;
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
