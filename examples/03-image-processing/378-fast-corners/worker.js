self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // FAST-9 circle offsets (16 points on a circle of radius 3)
    const circle = [
        [0, -3], [1, -3], [2, -2], [3, -1],
        [3, 0], [3, 1], [2, 2], [1, 3],
        [0, 3], [-1, 3], [-2, 2], [-3, 1],
        [-3, 0], [-3, -1], [-2, -2], [-1, -3]
    ];

    const corners = [];
    const n = 9; // Number of contiguous pixels needed

    for (let y = 3; y < height - 3; y++) {
        for (let x = 3; x < width - 3; x++) {
            const center = gray[y * width + x];

            // Quick test: check pixels 1, 5, 9, 13 first
            const p1 = gray[(y + circle[0][1]) * width + (x + circle[0][0])];
            const p5 = gray[(y + circle[4][1]) * width + (x + circle[4][0])];
            const p9 = gray[(y + circle[8][1]) * width + (x + circle[8][0])];
            const p13 = gray[(y + circle[12][1]) * width + (x + circle[12][0])];

            let brighterCount = 0;
            let darkerCount = 0;

            if (p1 > center + threshold) brighterCount++;
            else if (p1 < center - threshold) darkerCount++;

            if (p5 > center + threshold) brighterCount++;
            else if (p5 < center - threshold) darkerCount++;

            if (p9 > center + threshold) brighterCount++;
            else if (p9 < center - threshold) darkerCount++;

            if (p13 > center + threshold) brighterCount++;
            else if (p13 < center - threshold) darkerCount++;

            if (brighterCount < 3 && darkerCount < 3) continue;

            // Full test
            let brighter = 0, darker = 0;
            let maxBrighter = 0, maxDarker = 0;

            for (let i = 0; i < 32; i++) { // Check twice around circle
                const idx = i % 16;
                const px = gray[(y + circle[idx][1]) * width + (x + circle[idx][0])];

                if (px > center + threshold) {
                    brighter++;
                    darker = 0;
                    maxBrighter = Math.max(maxBrighter, brighter);
                } else if (px < center - threshold) {
                    darker++;
                    brighter = 0;
                    maxDarker = Math.max(maxDarker, darker);
                } else {
                    brighter = 0;
                    darker = 0;
                }
            }

            if (maxBrighter >= n || maxDarker >= n) {
                corners.push({ x, y });
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw corners as green circles
    for (const corner of corners) {
        const r = 2;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    const nx = corner.x + dx;
                    const ny = corner.y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        output[idx] = 0;
                        output[idx + 1] = 255;
                        output[idx + 2] = 0;
                    }
                }
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        corners: corners.length
    });
};
