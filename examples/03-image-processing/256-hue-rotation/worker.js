// Hue Rotation - Web Worker

self.onmessage = function(e) {
    const { imageData, width, height, hueRotation } = e.data;
    processHueRotation(new Uint8ClampedArray(imageData), width, height, hueRotation);
};

function processHueRotation(data, width, height, hueRotation) {
    const startTime = performance.now();
    const totalPixels = width * height;
    const result = new Uint8ClampedArray(data.length);

    let lastProgress = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        // Get RGB values (0-255)
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Convert RGB to HSL
        const hsl = rgbToHsl(r, g, b);

        // Rotate hue
        hsl.h = (hsl.h + hueRotation) % 360;
        if (hsl.h < 0) hsl.h += 360;

        // Convert back to RGB
        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);

        result[idx] = rgb.r;
        result[idx + 1] = rgb.g;
        result[idx + 2] = rgb.b;
        result[idx + 3] = a;

        // Report progress every 5%
        const progress = Math.floor((i / totalPixels) * 100);
        if (progress >= lastProgress + 5) {
            lastProgress = progress;
            self.postMessage({
                type: 'progress',
                percent: progress,
                processedPixels: i
            });
        }
    }

    const executionTime = performance.now() - startTime;

    self.postMessage({
        type: 'result',
        imageData: result.buffer,
        width: width,
        height: height,
        hueRotation: hueRotation,
        executionTime: executionTime
    }, [result.buffer]);
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
                break;
            case g:
                h = ((b - r) / d + 2) * 60;
                break;
            case b:
                h = ((r - g) / d + 4) * 60;
                break;
        }
    }

    return { h, s, l };
}

function hslToRgb(h, s, l) {
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
        const hNorm = h / 360;

        r = hue2rgb(p, q, hNorm + 1/3);
        g = hue2rgb(p, q, hNorm);
        b = hue2rgb(p, q, hNorm - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}
