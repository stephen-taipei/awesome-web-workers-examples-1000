self.onmessage = function(e) {
    const { imageData, dotSize, colorMode } = e.data;
    const startTime = performance.now();

    // 1. Generate Halftone Pattern
    const halftoneData = generateHalftone(imageData, dotSize);
    self.postMessage({ type: 'progress', data: 60 });

    // 2. Add Edges and/or Color
    const resultData = finalizeComic(imageData, halftoneData, colorMode);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: resultData,
            time: Math.round(endTime - startTime)
        }
    });
};

function generateHalftone(imageData, dotSize) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    // Create grayscale intensity map
    const intensities = new Float32Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
        // Inverse intensity: darker pixels = higher value for larger dots
        // Actually, for screen printing (black ink on white paper):
        // Darker source pixel -> Larger black dot
        // Intensity 0 (black) -> Max dot size
        // Intensity 255 (white) -> Min dot size
        const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        intensities[i/4] = 1.0 - (gray / 255.0);
    }

    const outputBuffer = new Uint8ClampedArray(data.length);
    // Fill with white initially
    outputBuffer.fill(255);

    // Grid processing
    const angle = 45 * (Math.PI / 180); // 45 degree screen angle is classic
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    // We iterate over the output image pixels and determine if they are inside a dot
    // This is pixel-shader style logic

    // Optimization: Block-based logic is faster but less accurate for rotation.
    // Let's do simple grid logic without rotation for simplicity and speed in JS,
    // or simple rotation coordinate transform.

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            // Transform coordinate to grid space
            // Rotate coordinates to get angled screen
            const u = x * cosA - y * sinA;
            const v = x * sinA + y * cosA;

            // Find the nearest grid point (dot center) in rotated space
            const gridU = Math.round(u / dotSize) * dotSize;
            const gridV = Math.round(v / dotSize) * dotSize;

            // Map grid point back to image space to sample intensity
            const centerX = gridU * cosA + gridV * sinA;
            const centerY = -gridU * sinA + gridV * cosA;

            const srcX = Math.min(Math.max(Math.round(centerX), 0), width - 1);
            const srcY = Math.min(Math.max(Math.round(centerY), 0), height - 1);

            const intensity = intensities[srcY * width + srcX];
            const maxRadius = dotSize / 1.5; // Allow some overlap
            const radius = maxRadius * Math.sqrt(intensity);

            // Distance from current pixel (rotated) to grid center (rotated)
            const dist = Math.sqrt((u - gridU)**2 + (v - gridV)**2);

            const idx = (y * width + x) * 4;

            if (dist < radius) {
                // Inside dot -> Black
                outputBuffer[idx] = 20; // Ink is rarely pure black
                outputBuffer[idx+1] = 20;
                outputBuffer[idx+2] = 20;
            }
            // Else remains white (255)
            outputBuffer[idx+3] = 255;
        }
    }

    return new ImageData(outputBuffer, width, height);
}

function finalizeComic(original, halftone, colorMode) {
    const width = original.width;
    const height = original.height;
    const origData = original.data;
    const halfData = halftone.data;
    const resultBuffer = new Uint8ClampedArray(origData.length);

    // Detect Edges from original
    const edgeMap = detectEdges(original);

    for (let i = 0; i < origData.length; i += 4) {
        let r, g, b;

        if (edgeMap[i/4] > 50) {
            // Edge -> Black ink
            r = 0; g = 0; b = 0;
        } else {
            // Halftone pattern
            const ink = halfData[i]; // 20 or 255

            if (colorMode) {
                // Multiply halftone with original color (posterized slightly?)
                // Or simply: if in black dot, use black. If in white space, use original color.
                if (ink < 100) {
                    // Dot area
                    r = ink; g = ink; b = ink;
                    // Optional: Colored dots instead of black dots?
                    // For CMYK separation we'd do 4 screens.
                    // For simple style, let's just multiply.
                    r = (origData[i] * ink) / 255;
                    g = (origData[i+1] * ink) / 255;
                    b = (origData[i+2] * ink) / 255;
                } else {
                    // White space -> Show original color (maybe lighter)
                    r = origData[i];
                    g = origData[i+1];
                    b = origData[i+2];
                }
            } else {
                // B&W Mode
                r = ink; g = ink; b = ink;
            }
        }

        resultBuffer[i] = r;
        resultBuffer[i+1] = g;
        resultBuffer[i+2] = b;
        resultBuffer[i+3] = 255;
    }

    return new ImageData(resultBuffer, width, height);
}

function detectEdges(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edges = new Uint8Array(width * height);

    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const rightIdx = (y * width + x + 1) * 4;
            const bottomIdx = ((y + 1) * width + x) * 4;

            const lum = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            const lumRight = (data[rightIdx] + data[rightIdx+1] + data[rightIdx+2]) / 3;
            const lumBottom = (data[bottomIdx] + data[bottomIdx+1] + data[bottomIdx+2]) / 3;

            const diff = Math.abs(lum - lumRight) + Math.abs(lum - lumBottom);
            edges[y * width + x] = diff;
        }
    }
    return edges;
}
