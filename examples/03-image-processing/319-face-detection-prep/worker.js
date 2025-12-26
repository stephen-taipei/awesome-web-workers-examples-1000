function isSkinTone(r, g, b) {
    // YCbCr color space skin detection
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;

    return y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
}

self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];

        if (isSkinTone(r, g, b)) {
            output[i] = r;
            output[i + 1] = g;
            output[i + 2] = b;
            output[i + 3] = 255;
        } else {
            // Gray out non-skin areas
            const gray = (r + g + b) / 3 * 0.3;
            output[i] = gray;
            output[i + 1] = gray;
            output[i + 2] = gray;
            output[i + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
