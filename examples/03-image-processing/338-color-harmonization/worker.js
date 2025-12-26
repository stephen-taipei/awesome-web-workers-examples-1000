function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
    h /= 360;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
}

function getHarmonyHues(baseHue, type) {
    switch (type) {
        case 'complementary': return [baseHue, (baseHue + 180) % 360];
        case 'analogous': return [baseHue, (baseHue + 30) % 360, (baseHue + 330) % 360];
        case 'triadic': return [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
        case 'split': return [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360];
        default: return [baseHue];
    }
}

function findNearestHarmony(h, harmonyHues) {
    let nearest = harmonyHues[0], minDist = 360;
    for (const hue of harmonyHues) {
        let dist = Math.abs(h - hue);
        if (dist > 180) dist = 360 - dist;
        if (dist < minDist) { minDist = dist; nearest = hue; }
    }
    return nearest;
}

self.onmessage = function(e) {
    const { imageData, harmonyType, intensity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    // Find dominant hue
    let hueSum = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
        const [h, s] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        if (s > 0.1) { hueSum += h; count++; }
    }
    const baseHue = count > 0 ? hueSum / count : 0;
    const harmonyHues = getHarmonyHues(baseHue, harmonyType);

    for (let i = 0; i < data.length; i += 4) {
        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        const targetHue = findNearestHarmony(h, harmonyHues);
        const newHue = h + (targetHue - h) * intensity;
        const [r, g, b] = hslToRgb(newHue, s, l);

        output[i] = r;
        output[i + 1] = g;
        output[i + 2] = b;
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
