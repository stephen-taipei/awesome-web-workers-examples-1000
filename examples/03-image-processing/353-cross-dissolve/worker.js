self.onmessage = function(e) {
    const { imageData, dissolve } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Create inverted/negative version for dissolve target
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];

        // Target: grayscale inverted
        const gray = (r + g + b) / 3;
        const invGray = 255 - gray;

        // Cross dissolve between original and inverted
        output[i] = r * (1 - dissolve) + invGray * dissolve;
        output[i + 1] = g * (1 - dissolve) + invGray * dissolve;
        output[i + 2] = b * (1 - dissolve) + invGray * dissolve;
        output[i + 3] = 255;
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
