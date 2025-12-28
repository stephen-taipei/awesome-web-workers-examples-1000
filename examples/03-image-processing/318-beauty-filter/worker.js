self.onmessage = function(e) {
    const { imageData, whiten, blush } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        // Whitening - increase brightness
        r = Math.min(255, r + whiten * 50);
        g = Math.min(255, g + whiten * 50);
        b = Math.min(255, b + whiten * 50);

        // Add pink blush
        r = Math.min(255, r + blush * 30);
        g = Math.min(255, g + blush * 10);

        output[i] = r;
        output[i + 1] = g;
        output[i + 2] = b;
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
