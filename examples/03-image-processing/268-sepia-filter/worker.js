// Sepia Filter - Web Worker

self.onmessage = function(e) {
    const { imageData, width, height, intensity } = e.data;

    const pixels = new Uint8ClampedArray(imageData);
    const totalPixels = width * height;

    // Sepia transformation matrix coefficients
    const sepiaR = [0.393, 0.769, 0.189];
    const sepiaG = [0.349, 0.686, 0.168];
    const sepiaB = [0.272, 0.534, 0.131];

    let lastProgress = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        // Alpha remains unchanged

        // Calculate sepia values
        let newR = sepiaR[0] * r + sepiaR[1] * g + sepiaR[2] * b;
        let newG = sepiaG[0] * r + sepiaG[1] * g + sepiaG[2] * b;
        let newB = sepiaB[0] * r + sepiaB[1] * g + sepiaB[2] * b;

        // Clamp values
        newR = Math.min(255, Math.max(0, newR));
        newG = Math.min(255, Math.max(0, newG));
        newB = Math.min(255, Math.max(0, newB));

        // Apply intensity (blend between original and sepia)
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
