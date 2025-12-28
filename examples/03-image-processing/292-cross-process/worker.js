self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Cross-process curves
    const redCurve = [], greenCurve = [], blueCurve = [];
    for (let i = 0; i < 256; i++) {
        redCurve[i] = Math.min(255, i * 1.2 + 20);
        greenCurve[i] = Math.min(255, Math.max(0, i * 0.9 - 10));
        blueCurve[i] = Math.min(255, i * 0.8 + 40);
    }

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];

        output[i] = r + (redCurve[r] - r) * strength;
        output[i + 1] = g + (greenCurve[g] - g) * strength;
        output[i + 2] = b + (blueCurve[b] - b) * strength;
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
