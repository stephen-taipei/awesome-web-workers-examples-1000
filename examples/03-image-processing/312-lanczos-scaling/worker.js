self.onmessage = function(e) {
    const { imageData, targetWidth, targetHeight, lobes } = e.data;
    const startTime = performance.now();

    const srcWidth = imageData.width;
    const srcHeight = imageData.height;
    const srcData = imageData.data;

    // Perform Lanczos resampling.
    // Separable: Resample X (srcWidth -> targetWidth), then Y (srcHeight -> targetHeight).
    // Or Y then X.

    // Intermediate buffer after horizontal resize
    const interWidth = targetWidth;
    const interHeight = srcHeight;
    // We use Float32 for precision during intermediate step
    const interData = new Float32Array(interWidth * interHeight * 4);

    // 1. Horizontal Resample (srcWidth -> targetWidth)
    // We compute weights for each target X.

    // Lanczos kernel
    function lanczos(x, a) {
        if (x === 0) return 1;
        if (Math.abs(x) >= a) return 0;
        return (Math.sin(Math.PI * x) / (Math.PI * x)) * (Math.sin(Math.PI * x / a) / (Math.PI * x / a));
    }

    const xRatio = srcWidth / targetWidth;

    // Precompute weights? For large images, cache miss might be issue, but computing sin/cos is expensive.
    // For scaling, weights depend on phase.

    // Let's implement direct convolution for horizontal pass.
    for (let x = 0; x < targetWidth; x++) {
        // Center of pixel in source coords
        const center = (x + 0.5) * xRatio;
        const left = Math.floor(center - lobes);
        const right = Math.ceil(center + lobes);

        // Normalize weights
        let totalWeight = 0;
        const weights = [];
        const indices = [];

        for (let i = left; i <= right; i++) {
            if (i >= 0 && i < srcWidth) {
                const w = lanczos(center - (i + 0.5), lobes);
                weights.push(w);
                indices.push(i);
                totalWeight += w;
            }
        }

        // Normalize
        for (let i = 0; i < weights.length; i++) weights[i] /= totalWeight;

        // Apply to all rows
        for (let y = 0; y < srcHeight; y++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let k = 0; k < indices.length; k++) {
                const srcIdx = (y * srcWidth + indices[k]) * 4;
                const weight = weights[k];
                r += srcData[srcIdx] * weight;
                g += srcData[srcIdx+1] * weight;
                b += srcData[srcIdx+2] * weight;
                a += srcData[srcIdx+3] * weight;
            }
            const dstIdx = (y * interWidth + x) * 4;
            interData[dstIdx] = r;
            interData[dstIdx+1] = g;
            interData[dstIdx+2] = b;
            interData[dstIdx+3] = a;
        }

        if (x % 50 === 0) {
             self.postMessage({ type: 'progress', progress: (x / targetWidth) * 50 });
        }
    }

    // 2. Vertical Resample (srcHeight -> targetHeight)
    const dstData = new Uint8ClampedArray(targetWidth * targetHeight * 4);
    const yRatio = srcHeight / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
        const center = (y + 0.5) * yRatio;
        const top = Math.floor(center - lobes);
        const bottom = Math.ceil(center + lobes);

        let totalWeight = 0;
        const weights = [];
        const indices = [];

        for (let i = top; i <= bottom; i++) {
            if (i >= 0 && i < srcHeight) {
                const w = lanczos(center - (i + 0.5), lobes);
                weights.push(w);
                indices.push(i);
                totalWeight += w;
            }
        }

        for (let i = 0; i < weights.length; i++) weights[i] /= totalWeight;

        for (let x = 0; x < targetWidth; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let k = 0; k < indices.length; k++) {
                const srcIdx = (indices[k] * interWidth + x) * 4;
                const weight = weights[k];
                r += interData[srcIdx] * weight;
                g += interData[srcIdx+1] * weight;
                b += interData[srcIdx+2] * weight;
                a += interData[srcIdx+3] * weight;
            }
            const dstIdx = (y * targetWidth + x) * 4;
            dstData[dstIdx] = r;
            dstData[dstIdx+1] = g;
            dstData[dstIdx+2] = b;
            dstData[dstIdx+3] = a;
        }

        if (y % 50 === 0) {
             self.postMessage({ type: 'progress', progress: 50 + (y / targetHeight) * 50 });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(dstData, targetWidth, targetHeight),
        duration: Math.round(endTime - startTime)
    });
};
