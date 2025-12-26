function simulateExposure(data, ev) {
    const output = new Float32Array(data.length);
    const multiplier = Math.pow(2, ev);

    for (let i = 0; i < data.length; i += 4) {
        output[i] = Math.min(255, data[i] * multiplier);
        output[i + 1] = Math.min(255, data[i + 1] * multiplier);
        output[i + 2] = Math.min(255, data[i + 2] * multiplier);
        output[i + 3] = 255;
    }
    return output;
}

function reinhardTonemap(value, maxLum) {
    return value / (1 + value / maxLum);
}

self.onmessage = function(e) {
    const { imageData, evRange, tonemap } = e.data;
    const { width, height, data } = imageData;

    // Simulate multiple exposures
    const underExposed = simulateExposure(data, -evRange);
    const normalExposed = new Float32Array(data);
    const overExposed = simulateExposure(data, evRange);

    // Merge exposures - weight by quality (avoid clipped values)
    const hdr = new Float32Array(data.length);

    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const under = underExposed[i + c];
            const normal = normalExposed[i + c];
            const over = overExposed[i + c];

            // Weight: prefer mid-tones
            const wUnder = Math.exp(-Math.pow((under - 128) / 80, 2));
            const wNormal = Math.exp(-Math.pow((normal - 128) / 80, 2));
            const wOver = Math.exp(-Math.pow((over - 128) / 80, 2));

            const totalWeight = wUnder + wNormal + wOver + 0.001;
            hdr[i + c] = (under * wUnder + normal * wNormal + over * wOver) / totalWeight;
        }
    }

    // Find max luminance for tone mapping
    let maxLum = 0;
    for (let i = 0; i < hdr.length; i += 4) {
        const lum = 0.299 * hdr[i] + 0.587 * hdr[i + 1] + 0.114 * hdr[i + 2];
        if (lum > maxLum) maxLum = lum;
    }

    // Apply tone mapping
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < hdr.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const mapped = reinhardTonemap(hdr[i + c] / 255, maxLum / 255 * (1 + tonemap));
            output[i + c] = mapped * 255;
        }
        output[i + 3] = 255;
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
