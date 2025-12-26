self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        // Sepia tone
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;

        r = r + (tr - r) * strength;
        g = g + (tg - g) * strength;
        b = b + (tb - b) * strength;

        // Fade blacks
        r = r + (50 - r) * strength * 0.2;
        g = g + (40 - g) * strength * 0.2;
        b = b + (30 - b) * strength * 0.2;

        // Reduce contrast
        r = ((r / 255 - 0.5) * (1 - strength * 0.3) + 0.5) * 255;
        g = ((g / 255 - 0.5) * (1 - strength * 0.3) + 0.5) * 255;
        b = ((b / 255 - 0.5) * (1 - strength * 0.3) + 0.5) * 255;

        output[i] = Math.max(0, Math.min(255, r));
        output[i + 1] = Math.max(0, Math.min(255, g));
        output[i + 2] = Math.max(0, Math.min(255, b));
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
