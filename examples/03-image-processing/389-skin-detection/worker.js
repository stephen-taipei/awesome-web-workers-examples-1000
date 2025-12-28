self.onmessage = function(e) {
    const { imageData, colorSpace } = e.data;
    const { width, height, data } = imageData;

    const output = new Uint8ClampedArray(data.length);
    let skinCount = 0;
    const totalPixels = width * height;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let isSkin = false;

        switch (colorSpace) {
            case 'ycbcr':
                isSkin = isSkinYCbCr(r, g, b);
                break;
            case 'hsv':
                isSkin = isSkinHSV(r, g, b);
                break;
            case 'rgb':
                isSkin = isSkinRGB(r, g, b);
                break;
        }

        if (isSkin) {
            skinCount++;
            output[i] = r;
            output[i + 1] = g;
            output[i + 2] = b;
            output[i + 3] = 255;
        } else {
            // Grayscale non-skin areas
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            output[i] = gray;
            output[i + 1] = gray;
            output[i + 2] = gray;
            output[i + 3] = 255;
        }
    }

    const percent = (skinCount / totalPixels) * 100;

    self.postMessage({
        imageData: new ImageData(output, width, height),
        percent
    });
};

function isSkinYCbCr(r, g, b) {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    return (y > 80) && (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);
}

function isSkinHSV(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : d / max;
    const v = max / 255;

    // Skin hue range: 0-50 degrees (red-yellow)
    // Saturation: 0.2-0.6
    // Value: 0.35-1.0
    return (h >= 0 && h <= 50) && (s >= 0.15 && s <= 0.68) && (v >= 0.35);
}

function isSkinRGB(r, g, b) {
    // RGB skin detection rules
    const rule1 = r > 95 && g > 40 && b > 20;
    const rule2 = Math.max(r, g, b) - Math.min(r, g, b) > 15;
    const rule3 = Math.abs(r - g) > 15;
    const rule4 = r > g && r > b;

    return rule1 && rule2 && rule3 && rule4;
}
