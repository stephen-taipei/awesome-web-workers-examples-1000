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
    const { imageData, blockSize, displacement, seed } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    // Seed PRNG
    const rand = mulberry32(seed);

    // Generate displacement map for blocks
    // To make it look like glass, nearby pixels should have similar displacement (coherence).
    // Or simpler: each block has a random displacement.

    // Iterating by blocks might produce blocky artifacts.
    // Better: Per-pixel displacement with noise, but that's expensive without Simplex noise lib.
    // Let's implement the block-based displacement as requested ("Glass Effect" often implies blocks or fragments).
    // Or "Frosted Glass" is high frequency noise. "Glass Effect" is usually distortion.
    // Let's do random displacement per pixel but controlled?
    // The prompt says "Fragment size, Displacement mapping". This suggests blocks.

    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {

            // Generate random displacement for this block
            const dx = (rand() - 0.5) * 2 * displacement;
            const dy = (rand() - 0.5) * 2 * displacement;

            // Apply to all pixels in block
            for (let by = 0; by < blockSize; by++) {
                const py = y + by;
                if (py >= height) break;

                for (let bx = 0; bx < blockSize; bx++) {
                    const px = x + bx;
                    if (px >= width) break;

                    // Source coordinate
                    let sx = Math.floor(px + dx);
                    let sy = Math.floor(py + dy);

                    // Clamp
                    sx = Math.max(0, Math.min(width - 1, sx));
                    sy = Math.max(0, Math.min(height - 1, sy));

                    const srcIdx = (sy * width + sx) * 4;
                    const dstIdx = (py * width + px) * 4;

                    dstData[dstIdx] = srcData[srcIdx];
                    dstData[dstIdx + 1] = srcData[srcIdx + 1];
                    dstData[dstIdx + 2] = srcData[srcIdx + 2];
                    dstData[dstIdx + 3] = srcData[srcIdx + 3];
                }
            }
        }

        if (y % (blockSize * 10) === 0 || y + blockSize >= height) {
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
