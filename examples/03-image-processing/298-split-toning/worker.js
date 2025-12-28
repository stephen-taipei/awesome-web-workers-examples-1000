function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

self.onmessage = function(e) {
    const { imageData, highlightHue, shadowHue } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const [hr, hg, hb] = hslToRgb(highlightHue, 0.5, 0.5);
    const [sr, sg, sb] = hslToRgb(shadowHue, 0.5, 0.5);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const blend = 0.3;

        if (lum > 0.5) {
            const t = (lum - 0.5) * 2 * blend;
            output[i] = r + (hr - r) * t;
            output[i + 1] = g + (hg - g) * t;
            output[i + 2] = b + (hb - b) * t;
        } else {
            const t = (0.5 - lum) * 2 * blend;
            output[i] = r + (sr - r) * t;
            output[i + 1] = g + (sg - g) * t;
            output[i + 2] = b + (sb - b) * t;
        }
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
