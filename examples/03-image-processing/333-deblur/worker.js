function applyUnsharpMask(data, width, height, strength) {
    const output = new Uint8ClampedArray(data.length);
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    const enhanced = 1 + strength * 4;
    kernel[4] = enhanced;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            let r = 0, g = 0, b = 0;
            let ki = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const nIdx = ((y + ky) * width + (x + kx)) * 4;
                    r += data[nIdx] * kernel[ki];
                    g += data[nIdx + 1] * kernel[ki];
                    b += data[nIdx + 2] * kernel[ki];
                    ki++;
                }
            }

            output[idx] = Math.max(0, Math.min(255, r));
            output[idx + 1] = Math.max(0, Math.min(255, g));
            output[idx + 2] = Math.max(0, Math.min(255, b));
            output[idx + 3] = 255;
        }
    }

    // Copy edges
    for (let x = 0; x < width; x++) {
        const top = x * 4;
        const bottom = ((height - 1) * width + x) * 4;
        for (let c = 0; c < 4; c++) {
            output[top + c] = data[top + c];
            output[bottom + c] = data[bottom + c];
        }
    }
    for (let y = 0; y < height; y++) {
        const left = (y * width) * 4;
        const right = (y * width + width - 1) * 4;
        for (let c = 0; c < 4; c++) {
            output[left + c] = data[left + c];
            output[right + c] = data[right + c];
        }
    }

    return output;
}

self.onmessage = function(e) {
    const { imageData, strength, iterations } = e.data;
    const { width, height } = imageData;
    let data = imageData.data;

    for (let i = 0; i < iterations; i++) {
        data = applyUnsharpMask(data, width, height, strength);
    }

    self.postMessage({ imageData: new ImageData(data, width, height) });
};
