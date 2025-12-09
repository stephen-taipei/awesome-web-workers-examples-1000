// Simple pseudo-random number generator
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

self.onmessage = function(e) {
    const { imageData, radius, seed } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    // Seed PRNG
    const rand = mulberry32(seed);

    // Frosted glass effect: For each pixel, pick a random neighbor within radius

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            // Random offset
            const dx = (rand() - 0.5) * 2 * radius;
            const dy = (rand() - 0.5) * 2 * radius;

            let nx = Math.floor(x + dx);
            let ny = Math.floor(y + dy);

            // Clamp
            nx = Math.max(0, Math.min(width - 1, nx));
            ny = Math.max(0, Math.min(height - 1, ny));

            const srcIdx = (ny * width + nx) * 4;
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
