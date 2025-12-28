self.onmessage = function(e) {
    const { imageData, temp, tint } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        // Temperature: warm (positive) or cool (negative)
        if (temp > 0) {
            r += temp * 0.5;
            b -= temp * 0.3;
        } else {
            r += temp * 0.3;
            b -= temp * 0.5;
        }

        // Tint: green (negative) or magenta (positive)
        g -= tint * 0.3;
        if (tint > 0) {
            r += tint * 0.2;
            b += tint * 0.2;
        }

        output[i] = Math.max(0, Math.min(255, r));
        output[i + 1] = Math.max(0, Math.min(255, g));
        output[i + 2] = Math.max(0, Math.min(255, b));
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
