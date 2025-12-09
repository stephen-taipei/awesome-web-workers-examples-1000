self.onmessage = function(e) {
    const { images } = e.data;
    if (!images.length) return;

    const w = images[0].width;
    const h = images[0].height;

    // Simplified HDR: Exposure Fusion (Mertens et al.)
    // We fuse images based on:
    // 1. Contrast (Laplacian) - we skip this for simple demo
    // 2. Saturation (Standard Deviation) - skip
    // 3. Well-exposedness (Gaussian curve)

    // We'll focus on Well-exposedness: punish pixels near 0 or 255.

    const size = w * h;
    const resultR = new Float32Array(size);
    const resultG = new Float32Array(size);
    const resultB = new Float32Array(size);
    const totalWeight = new Float32Array(size);

    // Gaussian function: exp( - (val - 0.5)^2 / (2 * sigma^2) )
    // We normalize pixel values to 0..1
    const sigma = 0.2;
    const sigma2 = 2 * sigma * sigma;

    function getWeight(val) {
        // val is 0..255
        const norm = val / 255;
        const dist = norm - 0.5;
        return Math.exp(-(dist*dist) / sigma2);
    }

    for (let k = 0; k < images.length; k++) {
        const data = images[k].data;

        for (let i = 0; i < size; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx+1];
            const b = data[idx+2];

            // Weight for this pixel
            // W = W(r) * W(g) * W(b)
            const wR = getWeight(r);
            const wG = getWeight(g);
            const wB = getWeight(b);

            const w = wR * wG * wB + 1e-12; // Avoid zero division

            resultR[i] += r * w;
            resultG[i] += g * w;
            resultB[i] += b * w;
            totalWeight[i] += w;
        }
    }

    // Finalize
    const finalData = new Uint8ClampedArray(size * 4);
    for (let i = 0; i < size; i++) {
        const idx = i * 4;
        finalData[idx] = resultR[i] / totalWeight[i];
        finalData[idx+1] = resultG[i] / totalWeight[i];
        finalData[idx+2] = resultB[i] / totalWeight[i];
        finalData[idx+3] = 255;
    }

    self.postMessage({ imageData: new ImageData(finalData, w, h) });
};
