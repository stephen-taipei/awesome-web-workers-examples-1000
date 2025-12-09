self.onmessage = function(e) {
    const { imageData, density, threshold } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    // Fill background white
    for (let i = 0; i < dstData.length; i += 4) {
        dstData[i] = 255;
        dstData[i+1] = 255;
        dstData[i+2] = 255;
        dstData[i+3] = 255;
    }

    // Crosshatch levels
    // Layer 1: / (lightest)
    // Layer 2: \
    // Layer 3: / (denser) or |
    // Layer 4: \ (denser) or -

    // Function to draw a line
    // Since we can't easily draw lines in ImageData without Bresenham, we can iterate pixels and check if they belong to a line equation.
    // Line: y = kx + b
    // Grid: (x + y) % spacing == 0 for / lines
    //       (x - y) % spacing == 0 for \ lines

    const spacing = 10 / density;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // Calculate brightness (0-1)
            const brightness = (srcData[idx] * 0.299 + srcData[idx+1] * 0.587 + srcData[idx+2] * 0.114) / 255;

            // Adjust brightness by threshold
            // Higher threshold factor -> darker result (more lines)
            const b = brightness * (2 - threshold);

            let isBlack = false;

            // Layer 1: / lines (light gray areas get this)
            if (b < 0.8) {
                if ((x + y) % spacing < 1) isBlack = true;
            }

            // Layer 2: \ lines (medium gray)
            if (b < 0.6) {
                if (Math.abs((x - y) % spacing) < 1) isBlack = true;
            }

            // Layer 3: / lines denser or offset
            if (b < 0.4) {
                 if ((x + y + spacing/2) % spacing < 1) isBlack = true;
            }

            // Layer 4: \ lines denser
            if (b < 0.2) {
                 if (Math.abs((x - y + spacing/2) % spacing) < 1) isBlack = true;
            }

            if (isBlack) {
                const dstIdx = (y * width + x) * 4;
                dstData[dstIdx] = 0; // Black lines
                dstData[dstIdx+1] = 0;
                dstData[dstIdx+2] = 0;
            }
        }

        if (y % 100 === 0) {
            self.postMessage({ type: 'progress', progress: (y / height) * 100 });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        imageData: resultImageData,
        time: endTime - startTime
    });
};
