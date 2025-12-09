self.onmessage = function(e) {
    const { imageData, palette, t1, t2 } = e.data;
    const startTime = performance.now();

    // 1. Get Palette colors
    const colors = getPalette(palette);

    // 2. Apply Threshold and Recolor
    const resultData = applyPopArt(imageData, colors, t1, t2);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: resultData,
            time: Math.round(endTime - startTime)
        }
    });
};

function getPalette(name) {
    const palettes = {
        'warhol': [
            [30, 30, 30],       // Dark (Black/Ink)
            [230, 50, 120],     // Mid-Dark (Magenta)
            [255, 220, 0],      // Mid-Light (Yellow)
            [100, 200, 255]     // Light (Blue)
        ],
        'neon': [
            [20, 20, 20],       // Dark (Almost Black)
            [100, 0, 200],      // Purple
            [0, 255, 150],      // Neon Green
            [255, 0, 255]       // Neon Pink
        ],
        'fire': [
            [60, 0, 0],         // Dark Red
            [200, 0, 0],        // Red
            [255, 100, 0],      // Orange
            [255, 255, 0]       // Yellow
        ],
        'ocean': [
            [0, 0, 80],         // Navy
            [0, 100, 180],      // Blue
            [0, 200, 200],      // Cyan
            [220, 240, 255]     // Whiteish
        ]
    };
    return palettes[name] || palettes['warhol'];
}

function applyPopArt(imageData, colors, t1, t2) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const outputBuffer = new Uint8ClampedArray(data.length);

    // Sort thresholds to ensure t1 < t2
    const lowT = Math.min(t1, t2);
    const highT = Math.max(t1, t2);

    for (let i = 0; i < data.length; i += 4) {
        // Calculate grayscale brightness
        const brightness = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];

        let colorIdx;

        if (brightness < lowT) {
            colorIdx = 0; // Darkest
        } else if (brightness < (lowT + highT) / 2) {
            colorIdx = 1; // Mid-Dark
        } else if (brightness < highT) {
            colorIdx = 2; // Mid-Light
        } else {
            colorIdx = 3; // Lightest
        }

        const [r, g, b] = colors[colorIdx];

        outputBuffer[i] = r;
        outputBuffer[i+1] = g;
        outputBuffer[i+2] = b;
        outputBuffer[i+3] = data[i+3];

        if (i % (width * 4 * 50) === 0) {
             self.postMessage({ type: 'progress', data: (i / data.length) * 100 });
        }
    }

    self.postMessage({ type: 'progress', data: 100 });
    return new ImageData(outputBuffer, width, height);
}
