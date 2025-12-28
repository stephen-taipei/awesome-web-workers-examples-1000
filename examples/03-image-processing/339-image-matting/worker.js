function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(
        (r1 - r2) ** 2 +
        (g1 - g2) ** 2 +
        (b1 - b2) ** 2
    );
}

self.onmessage = function(e) {
    const { imageData, bgColor, tolerance, feather } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const maxDist = tolerance * 4.41; // ~sqrt(3) * 255 * tolerance/100

    // Calculate alpha based on color distance
    for (let i = 0; i < data.length; i += 4) {
        const dist = colorDistance(
            data[i], data[i + 1], data[i + 2],
            bgColor.r, bgColor.g, bgColor.b
        );

        if (dist < maxDist) {
            // Within tolerance - transparent
            const alpha = Math.min(255, Math.max(0, (dist / maxDist) * 255));
            output[i + 3] = alpha;
        } else {
            output[i + 3] = 255;
        }
    }

    // Apply feathering
    if (feather > 0) {
        const alpha = new Float32Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            alpha[i / 4] = output[i + 3];
        }

        // Simple blur for feathering
        for (let pass = 0; pass < feather; pass++) {
            const temp = new Float32Array(alpha);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    temp[idx] = (
                        alpha[idx - width - 1] + alpha[idx - width] + alpha[idx - width + 1] +
                        alpha[idx - 1] + alpha[idx] + alpha[idx + 1] +
                        alpha[idx + width - 1] + alpha[idx + width] + alpha[idx + width + 1]
                    ) / 9;
                }
            }
            for (let i = 0; i < alpha.length; i++) alpha[i] = temp[i];
        }

        for (let i = 0; i < alpha.length; i++) {
            output[i * 4 + 3] = Math.round(alpha[i]);
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
