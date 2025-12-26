self.onmessage = function(e) {
    const { imageData, exposure, gamma } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const invGamma = 1 / gamma;

    for (let i = 0; i < data.length; i += 4) {
        // Apply exposure
        let r = (data[i] / 255) * exposure;
        let g = (data[i + 1] / 255) * exposure;
        let b = (data[i + 2] / 255) * exposure;

        // Reinhard tone mapping
        r = r / (1 + r);
        g = g / (1 + g);
        b = b / (1 + b);

        // Gamma correction
        r = Math.pow(r, invGamma);
        g = Math.pow(g, invGamma);
        b = Math.pow(b, invGamma);

        output[i] = Math.min(255, r * 255);
        output[i + 1] = Math.min(255, g * 255);
        output[i + 2] = Math.min(255, b * 255);
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
