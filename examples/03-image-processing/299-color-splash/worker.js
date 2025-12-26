function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
            case g: h = ((b - r) / d + 2) * 60; break;
            case b: h = ((r - g) / d + 4) * 60; break;
        }
    }
    return [h, s, l];
}

self.onmessage = function(e) {
    const { imageData, targetHue, tolerance } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const [h, s] = rgbToHsl(r, g, b);

        // Calculate hue distance (circular)
        let hueDiff = Math.abs(h - targetHue);
        if (hueDiff > 180) hueDiff = 360 - hueDiff;

        // Keep color if within tolerance and saturated enough
        if (hueDiff <= tolerance && s > 0.2) {
            output[i] = r;
            output[i + 1] = g;
            output[i + 2] = b;
        } else {
            // Convert to grayscale
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            output[i] = gray;
            output[i + 1] = gray;
            output[i + 2] = gray;
        }
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
