self.onmessage = function(e) {
    const { imageData, strength, radius, color } = e.data;
    const startTime = performance.now();

    try {
        const resultImageData = applyVignette(imageData, strength, radius, color);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: resultImageData,
            duration: endTime - startTime
        });
    } catch (error) {
        console.error(error);
        self.postMessage({ type: 'error', error: error.message });
    }
};

function applyVignette(imageData, strength, radius, color) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(data.length);

    // Vignette color
    const vr = color[0];
    const vg = color[1];
    const vb = color[2];

    // Center point
    const cx = width / 2;
    const cy = height / 2;
    // Max distance from center to corner
    const maxDist = Math.sqrt(cx*cx + cy*cy);

    // Effective radius
    const rStart = radius * maxDist * 0.5; // Inner radius where gradient starts
    const rEnd = maxDist * 1.0; // Outer radius

    for (let y = 0; y < height; y++) {
        if (y % 50 === 0) self.postMessage({ type: 'progress', progress: y / height });

        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Calculate distance from center
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Calculate mix factor
            // Factor 0 = original image, 1 = vignette color
            let factor = 0;

            if (dist > rStart) {
                // Linear interpolation or smoothstep
                // factor = (dist - rStart) / (rEnd - rStart);
                // Let's use smoothstep-like curve
                 const t = (dist - rStart) / (maxDist - rStart);
                 factor = Math.max(0, Math.min(1, t));
                 factor = factor * strength; // Scale by strength
                 // Non-linear falloff
                 factor = factor * factor * (3 - 2 * factor); // Smoothstep
            }

            // Apply mix
            // result = original * (1 - factor) + vignette * factor
            result[idx] = data[idx] * (1 - factor) + vr * factor;
            result[idx+1] = data[idx+1] * (1 - factor) + vg * factor;
            result[idx+2] = data[idx+2] * (1 - factor) + vb * factor;
            result[idx+3] = data[idx+3];
        }
    }

    return new ImageData(result, width, height);
}
