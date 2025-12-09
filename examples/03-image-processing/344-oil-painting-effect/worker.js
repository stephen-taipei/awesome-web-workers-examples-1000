self.onmessage = function(e) {
    const { imageData, radius } = e.data;
    const startTime = performance.now();

    const resultData = kuwaharaFilter(imageData, radius);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: resultData,
            time: Math.round(endTime - startTime)
        }
    });
};

function kuwaharaFilter(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const outputBuffer = new Uint8ClampedArray(data.length);

    // Radius defines the quadrant size. e.g. radius=3 means 3x3 quadrants.
    // Total window is (2*radius+1) x (2*radius+1)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            // Four quadrants: TL, TR, BL, BR
            // We need to calculate mean (rgb) and variance (luminance) for each

            let minVariance = Infinity;
            let finalR = 0, finalG = 0, finalB = 0;

            // Defines the offsets for the 4 quadrants relative to (x,y)
            // The center pixel is included in all quadrants
            const quadrants = [
                { startX: -radius, endX: 0, startY: -radius, endY: 0 }, // TL
                { startX: 0, endX: radius, startY: -radius, endY: 0 },  // TR
                { startX: -radius, endX: 0, startY: 0, endY: radius },  // BL
                { startX: 0, endX: radius, startY: 0, endY: radius }    // BR
            ];

            for (let q = 0; q < 4; q++) {
                const quad = quadrants[q];
                let rSum = 0, gSum = 0, bSum = 0;
                let rSqSum = 0, gSqSum = 0, bSqSum = 0;
                let count = 0;

                for (let dy = quad.startY; dy <= quad.endY; dy++) {
                    for (let dx = quad.startX; dx <= quad.endX; dx++) {
                        const ny = Math.min(Math.max(y + dy, 0), height - 1);
                        const nx = Math.min(Math.max(x + dx, 0), width - 1);
                        const idx = (ny * width + nx) * 4;

                        const r = data[idx];
                        const g = data[idx+1];
                        const b = data[idx+2];

                        rSum += r;
                        gSum += g;
                        bSum += b;

                        rSqSum += r * r;
                        gSqSum += g * g;
                        bSqSum += b * b;

                        count++;
                    }
                }

                const rMean = rSum / count;
                const gMean = gSum / count;
                const bMean = bSum / count;

                // Variance = Mean(Square) - Square(Mean)
                // We sum variances of RGB channels as total variance measure
                const rVar = (rSqSum / count) - (rMean * rMean);
                const gVar = (gSqSum / count) - (gMean * gMean);
                const bVar = (bSqSum / count) - (bMean * bMean);

                const totalVariance = rVar + gVar + bVar;

                if (totalVariance < minVariance) {
                    minVariance = totalVariance;
                    finalR = rMean;
                    finalG = gMean;
                    finalB = bMean;
                }
            }

            const idx = (y * width + x) * 4;
            outputBuffer[idx] = finalR;
            outputBuffer[idx+1] = finalG;
            outputBuffer[idx+2] = finalB;
            outputBuffer[idx+3] = data[idx+3];
        }

        if (y % 20 === 0) {
            self.postMessage({ type: 'progress', data: (y / height) * 100 });
        }
    }

    self.postMessage({ type: 'progress', data: 100 });
    return new ImageData(outputBuffer, width, height);
}
