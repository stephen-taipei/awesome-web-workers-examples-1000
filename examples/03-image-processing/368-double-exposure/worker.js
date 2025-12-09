self.onmessage = function(e) {
    const { base, overlay, params } = e.data;
    const startTime = performance.now();

    const width = base.width;
    const height = base.height;

    const baseData = base.data;
    const overlayData = overlay.data;
    const resultBuffer = new Uint8ClampedArray(baseData.length);

    const { mode, opacity } = params;

    // Helper functions for blend modes
    // Standard Photoshop/CSS blend modes.
    // Inputs: a (base), b (overlay) normalized 0-1
    // Output: 0-1

    function blend(a, b, m) {
        switch (m) {
            case 'multiply':
                return a * b;
            case 'screen':
                return 1 - (1 - a) * (1 - b);
            case 'overlay':
                return (a < 0.5) ? (2 * a * b) : (1 - 2 * (1 - a) * (1 - b));
            case 'lighten':
                return Math.max(a, b);
            case 'darken':
                return Math.min(a, b);
            case 'hard-light':
                return (b < 0.5) ? (2 * a * b) : (1 - 2 * (1 - a) * (1 - b)); // Same as overlay but swapped a,b
            case 'soft-light':
                 // W3C formula:
                 // if(Cs <= 0.5) B = Cb - (1 - 2 * Cs) * Cb * (1 - Cb)
                 // else B = Cb + (2 * Cs - 1) * (D(Cb) - Cb)
                 // Simplified:
                 return (1 - 2 * b) * a * a + 2 * b * a;
            default:
                return b;
        }
    }

    for (let i = 0; i < baseData.length; i += 4) {
        const r1 = baseData[i] / 255;
        const g1 = baseData[i+1] / 255;
        const b1 = baseData[i+2] / 255;
        const a1 = baseData[i+3] / 255; // usually 1

        const r2 = overlayData[i] / 255;
        const g2 = overlayData[i+1] / 255;
        const b2 = overlayData[i+2] / 255;
        const a2 = overlayData[i+3] / 255; // usually 1

        let r, g, b;

        if (mode === 'hard-light') {
             r = blend(r1, r2, 'hard-light');
             g = blend(g1, g2, 'hard-light');
             b = blend(b1, b2, 'hard-light');
        } else {
             r = blend(r1, r2, mode);
             g = blend(g1, g2, mode);
             b = blend(b1, b2, mode);
        }

        // Apply opacity (Mix original base with blended result)
        // result = base * (1 - opacity) + blended * opacity

        r = r1 * (1 - opacity) + r * opacity;
        g = g1 * (1 - opacity) + g * opacity;
        b = b1 * (1 - opacity) + b * opacity;

        resultBuffer[i] = r * 255;
        resultBuffer[i+1] = g * 255;
        resultBuffer[i+2] = b * 255;
        resultBuffer[i+3] = 255; // Full alpha
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        imageData: new ImageData(resultBuffer, width, height),
        time: endTime - startTime
    });
};
