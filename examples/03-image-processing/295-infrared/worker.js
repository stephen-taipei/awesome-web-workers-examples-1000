self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];

        // Infrared: swap red and blue, boost green channel (foliage appears white)
        const ir = b + g * 0.5;
        const ig = g * 1.2;
        const ib = r;

        // Apply strength
        output[i] = Math.min(255, r + (ir - r) * strength);
        output[i + 1] = Math.min(255, g + (ig - g) * strength);
        output[i + 2] = Math.min(255, b + (ib - b) * strength);
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
