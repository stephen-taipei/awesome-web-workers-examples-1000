self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];

        // Detect red pixels (high red, low green/blue)
        const redIntensity = r / ((g + b) / 2 + 1);
        const isRed = redIntensity > (2 - threshold) && r > 80;

        if (isRed) {
            // Replace with average of green and blue
            const newVal = (g + b) / 2;
            output[i] = newVal;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
