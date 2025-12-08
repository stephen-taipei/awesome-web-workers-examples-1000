// Saturation Adjustment - Web Worker
// Processes image data by converting to HSL, adjusting saturation, and converting back

self.onmessage = function(e) {
    const { imageData, width, height, saturation } = e.data;
    const startTime = performance.now();

    // Create a copy of the image data
    const data = new Uint8ClampedArray(imageData.data);
    const totalPixels = width * height;

    // Saturation factor (0 = grayscale, 1 = normal, 2 = double saturation)
    const satFactor = saturation / 100;

    // Stats for analysis
    let totalSatBefore = 0;
    let totalSatAfter = 0;
    const hueDistBefore = new Array(360).fill(0);
    const hueDistAfter = new Array(360).fill(0);

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;

        // Convert RGB to HSL
        const hsl = rgbToHsl(r, g, b);

        // Record stats before
        totalSatBefore += hsl.s;
        if (hsl.s > 0.1) {
            hueDistBefore[Math.floor(hsl.h * 360) % 360]++;
        }

        // Adjust saturation
        const newS = Math.min(1, Math.max(0, hsl.s * satFactor));

        // Record stats after
        totalSatAfter += newS;
        if (newS > 0.1) {
            hueDistAfter[Math.floor(hsl.h * 360) % 360]++;
        }

        // Convert back to RGB
        const rgb = hslToRgb(hsl.h, newS, hsl.l);

        data[i] = Math.round(rgb.r * 255);
        data[i + 1] = Math.round(rgb.g * 255);
        data[i + 2] = Math.round(rgb.b * 255);
        // data[i + 3] unchanged (Alpha)

        // Report progress every 10%
        if (i % (data.length / 10 | 0) < 4) {
            const progress = Math.round((i / data.length) * 100);
            self.postMessage({
                type: 'progress',
                progress: progress
            });
        }
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Send back the result
    self.postMessage({
        type: 'result',
        imageData: {
            data: data,
            width: width,
            height: height
        },
        stats: {
            width: width,
            height: height,
            totalPixels: totalPixels,
            processingTime: processingTime,
            saturation: saturation,
            satFactor: satFactor,
            avgSatBefore: totalSatBefore / totalPixels,
            avgSatAfter: totalSatAfter / totalPixels,
            hueDistBefore: hueDistBefore,
            hueDistAfter: hueDistAfter
        }
    });
};

// Convert RGB to HSL
function rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return { h, s, l };
}

// Convert HSL to RGB
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1/3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1/3);
    }

    return { r, g, b };
}

function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}
