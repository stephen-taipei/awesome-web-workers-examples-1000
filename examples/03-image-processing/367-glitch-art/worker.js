self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    // Copy input data to work on
    const resultBuffer = new Uint8ClampedArray(imageData.data);

    const { intensity, seed } = params;

    if (intensity === 0) {
        self.postMessage({
            type: 'result',
            imageData: imageData,
            time: 0
        });
        return;
    }

    // Pseudo-random number generator based on seed
    let currentSeed = seed;
    function random() {
        const x = Math.sin(currentSeed++) * 10000;
        return x - Math.floor(x);
    }

    function randomInt(max) {
        return Math.floor(random() * max);
    }

    // Amount of glitches
    const numGlitches = Math.floor(intensity / 5) + 1;

    // 1. Row Shifting (Horizontal Displacement)
    const numShifts = Math.floor(intensity / 2); // e.g., 50 -> 25 shifts
    for (let i = 0; i < numShifts; i++) {
        // Pick a random row or chunk of rows
        const rowHeight = randomInt(height / 10) + 1; // 1 to 10% height
        const startY = randomInt(height - rowHeight);
        const shiftAmount = randomInt(width / 2) - (width / 4); // -25% to +25% width

        // Apply shift
        for (let y = startY; y < startY + rowHeight; y++) {
            const rowOffset = y * width * 4;
            // Create a temp buffer for the row
            const rowData = new Uint8ClampedArray(width * 4);

            // Copy row
            for (let j=0; j<width*4; j++) {
                rowData[j] = resultBuffer[rowOffset + j];
            }

            // Write back shifted
            for (let x = 0; x < width; x++) {
                let srcX = x - shiftAmount;
                // Wrap around or clamp? Wrap usually looks glitchier.
                if (srcX < 0) srcX += width;
                if (srcX >= width) srcX -= width;

                const destIdx = rowOffset + x * 4;
                const srcIdx = srcX * 4;

                resultBuffer[destIdx] = rowData[srcIdx];
                resultBuffer[destIdx+1] = rowData[srcIdx+1];
                resultBuffer[destIdx+2] = rowData[srcIdx+2];
                resultBuffer[destIdx+3] = rowData[srcIdx+3];
            }
        }
    }

    // 2. Color Channel Shift (RGB Split)
    const splitAmount = randomInt(intensity / 2); // Max shift pixels
    if (splitAmount > 0) {
        // We only shift one channel, say Green, or Red
        const channel = randomInt(3); // 0, 1, 2
        const shiftX = randomInt(splitAmount * 2) - splitAmount;

        // Copy original buffer again to sample from
        const tempBuffer = new Uint8ClampedArray(resultBuffer);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let srcX = x - shiftX;
                if (srcX < 0) srcX = 0;
                if (srcX >= width) srcX = width - 1;

                const idx = (y * width + x) * 4;
                const srcIdx = (y * width + srcX) * 4;

                resultBuffer[idx + channel] = tempBuffer[srcIdx + channel];
            }
        }
    }

    // 3. Random Block Corruption (Sorting or Solid Color)
    const numBlocks = Math.floor(intensity / 10);
    for (let i = 0; i < numBlocks; i++) {
        const w = randomInt(width / 5) + 20;
        const h = randomInt(height / 5) + 5;
        const x = randomInt(width - w);
        const y = randomInt(height - h);

        // Sort pixels in this block? Or invert?
        const type = random();
        if (type < 0.3) {
            // Invert color
             for (let by = 0; by < h; by++) {
                for (let bx = 0; bx < w; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    resultBuffer[idx] = 255 - resultBuffer[idx];
                    resultBuffer[idx+1] = 255 - resultBuffer[idx+1];
                    resultBuffer[idx+2] = 255 - resultBuffer[idx+2];
                }
            }
        } else if (type < 0.6) {
            // Replace with noise
             for (let by = 0; by < h; by++) {
                for (let bx = 0; bx < w; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    const gray = randomInt(255);
                    resultBuffer[idx] = gray;
                    resultBuffer[idx+1] = gray;
                    resultBuffer[idx+2] = gray;
                }
            }
        } else {
             // Pixel sorting (horizontal sort of brightness) within the block rows
             for (let by = 0; by < h; by++) {
                 // Extract row segment
                 const rowSeg = [];
                 for (let bx = 0; bx < w; bx++) {
                     const idx = ((y + by) * width + (x + bx)) * 4;
                     rowSeg.push({
                         r: resultBuffer[idx],
                         g: resultBuffer[idx+1],
                         b: resultBuffer[idx+2],
                         a: resultBuffer[idx+3],
                         // luma
                         l: resultBuffer[idx]*0.299 + resultBuffer[idx+1]*0.587 + resultBuffer[idx+2]*0.114
                     });
                 }

                 // Sort
                 rowSeg.sort((a, b) => a.l - b.l);

                 // Write back
                 for (let bx = 0; bx < w; bx++) {
                     const idx = ((y + by) * width + (x + bx)) * 4;
                     resultBuffer[idx] = rowSeg[bx].r;
                     resultBuffer[idx+1] = rowSeg[bx].g;
                     resultBuffer[idx+2] = rowSeg[bx].b;
                     resultBuffer[idx+3] = rowSeg[bx].a;
                 }
             }
        }
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        imageData: new ImageData(resultBuffer, width, height),
        time: endTime - startTime
    });
};
