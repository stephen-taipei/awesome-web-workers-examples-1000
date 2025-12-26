// worker.js

self.onmessage = function(e) {
    const { imageData } = e.data;

    try {
        const startTime = performance.now();

        // Convert to proper ImageData if needed (though browser passes it structurally cloned)
        // We will operate on RGB channels independently or Luminance?
        // Usually Histogram Equalization is done on the Luminance channel (Y in YCbCr or L in HSL/Lab)
        // to preserve color balance. However, doing it on RGB independently can cause color shifts.
        // Let's implement Luminance based equalization first (convert to HSL/HSV/YUV, equalize Y/L/V, convert back).
        // Or for simplicity in this example, we can stick to RGB independent equalization and see the "artistic" effect,
        // but typically "Enhance contrast" implies keeping colors somewhat natural.
        // Better approach: Convert to HSL, equalize L, convert back.

        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // Report progress
        self.postMessage({ type: 'progress', data: 10 });

        // Convert RGB to HSL, extract L
        // Helper arrays
        const hList = new Float32Array(width * height);
        const sList = new Float32Array(width * height);
        const lList = new Float32Array(width * height);

        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const r = data[idx] / 255;
            const g = data[idx+1] / 255;
            const b = data[idx+2] / 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0; // achromatic
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }

            hList[i] = h;
            sList[i] = s;
            lList[i] = l;
        }

        self.postMessage({ type: 'progress', data: 40 });

        // Calculate Histogram for L channel
        // L is 0..1 float. We can quantize it to 0..255 for histogram
        const histogram = new Uint32Array(256);
        const lQuantized = new Uint8Array(width * height);

        for (let i = 0; i < width * height; i++) {
            const val = Math.round(lList[i] * 255);
            lQuantized[i] = val;
            histogram[val]++;
        }

        // Calculate CDF
        const cdf = new Uint32Array(256);
        let cum = 0;
        let cdfMin = 0;
        let cdfMinFound = false;

        for (let i = 0; i < 256; i++) {
            cum += histogram[i];
            cdf[i] = cum;
            if (!cdfMinFound && histogram[i] > 0) {
                cdfMin = cdf[i];
                cdfMinFound = true;
            }
        }

        self.postMessage({ type: 'progress', data: 60 });

        // Map L values
        const totalPixels = width * height;
        const lMap = new Uint8Array(256);

        for (let i = 0; i < 256; i++) {
             lMap[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
        }

        // Apply map and convert back to RGB
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            const h = hList[i];
            const s = sList[i];
            let l = lMap[lQuantized[i]] / 255; // New L

            // HSL to RGB
            let r, g, b;

            if (s === 0) {
                r = g = b = l; // achromatic
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

            data[idx] = Math.round(r * 255);
            data[idx+1] = Math.round(g * 255);
            data[idx+2] = Math.round(b * 255);
            // Alpha remains unchanged
        }

        self.postMessage({ type: 'progress', data: 90 });

        // Calculate final histogram for display (RGB)
        const finalHistogram = {
            r: new Array(256).fill(0),
            g: new Array(256).fill(0),
            b: new Array(256).fill(0)
        };

        for (let i = 0; i < data.length; i += 4) {
            finalHistogram.r[data[i]]++;
            finalHistogram.g[data[i + 1]]++;
            finalHistogram.b[data[i + 2]]++;
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: imageData,
                time: endTime - startTime
            },
            histogram: finalHistogram
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
