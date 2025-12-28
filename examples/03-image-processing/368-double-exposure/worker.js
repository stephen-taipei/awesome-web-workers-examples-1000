self.onmessage = function(e) {
    const { image1, image2, blendMode, ratio } = e.data;
    const { width, height, data: data1 } = image1;
    const data2 = image2.data;
    const output = new Uint8ClampedArray(data1.length);

    // Resize image2 to match image1 if needed
    const w2 = image2.width, h2 = image2.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx1 = (y * width + x) * 4;
            const x2 = Math.floor(x * w2 / width);
            const y2 = Math.floor(y * h2 / height);
            const idx2 = (y2 * w2 + x2) * 4;

            const r1 = data1[idx1] / 255, g1 = data1[idx1 + 1] / 255, b1 = data1[idx1 + 2] / 255;
            const r2 = data2[idx2] / 255, g2 = data2[idx2 + 1] / 255, b2 = data2[idx2 + 2] / 255;

            let r, g, b;
            switch (blendMode) {
                case 'screen':
                    r = 1 - (1 - r1) * (1 - r2);
                    g = 1 - (1 - g1) * (1 - g2);
                    b = 1 - (1 - b1) * (1 - b2);
                    break;
                case 'multiply':
                    r = r1 * r2; g = g1 * g2; b = b1 * b2;
                    break;
                case 'overlay':
                    r = r1 < 0.5 ? 2 * r1 * r2 : 1 - 2 * (1 - r1) * (1 - r2);
                    g = g1 < 0.5 ? 2 * g1 * g2 : 1 - 2 * (1 - g1) * (1 - g2);
                    b = b1 < 0.5 ? 2 * b1 * b2 : 1 - 2 * (1 - b1) * (1 - b2);
                    break;
                case 'lighten':
                    r = Math.max(r1, r2); g = Math.max(g1, g2); b = Math.max(b1, b2);
                    break;
            }

            output[idx1] = (r1 * (1 - ratio) + r * ratio) * 255;
            output[idx1 + 1] = (g1 * (1 - ratio) + g * ratio) * 255;
            output[idx1 + 2] = (b1 * (1 - ratio) + b * ratio) * 255;
            output[idx1 + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
