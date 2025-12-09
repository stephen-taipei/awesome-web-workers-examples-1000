// Warm Tone Filter - Web Worker

self.onmessage = function(e) {
    const { imageData, width, height, intensity, warmth } = e.data;

    const pixels = new Uint8ClampedArray(imageData);
    const totalPixels = width * height;

    // Warm tone transformation parameters
    const redBoost = 0.3;        // How much to boost red
    const greenBoost = 0.1;      // Slight green increase
    const blueReduction = 0.2;   // Blue channel reduction

    let lastProgress = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        // Alpha remains unchanged

        // Calculate warm tone values
        let newR = r * (1 + intensity * redBoost) + intensity * warmth * 0.6;
        let newG = g * (1 + intensity * greenBoost) + intensity * warmth * 0.2;
        let newB = b * (1 - intensity * blueReduction);

        // Clamp values
        newR = Math.min(255, Math.max(0, newR));
        newG = Math.min(255, Math.max(0, newG));
        newB = Math.min(255, Math.max(0, newB));

        // Apply intensity (blend between original and warm tone)
        pixels[idx] = Math.round(r + (newR - r) * intensity);
        pixels[idx + 1] = Math.round(g + (newG - g) * intensity);
        pixels[idx + 2] = Math.round(b + (newB - b) * intensity);

        // Report progress every 2%
        const progress = Math.floor((i / totalPixels) * 100);
        if (progress >= lastProgress + 2) {
            lastProgress = progress;
            self.postMessage({
                type: 'progress',
                percent: progress,
                processedPixels: i,
                totalPixels: totalPixels
            });
        }
    }

    // Send result back
    self.postMessage({
        type: 'result',
        imageData: pixels.buffer
    }, [pixels.buffer]);
};
