self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Result buffer
    const resultBuffer = new Uint8ClampedArray(data.length);

    const { angle, distance } = params;

    // Direction vector
    // Standard math angle: 0 is right (X+), 90 is down (Y+) in canvas coords
    const rad = (angle * Math.PI) / 180;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);

    // If distance is 0, just copy
    if (distance === 0) {
        resultBuffer.set(data);
        self.postMessage({
            type: 'result',
            imageData: new ImageData(resultBuffer, width, height),
            time: 0
        });
        return;
    }

    // Motion blur: Average of pixels along the line
    // To optimize, usually two passes? But arbitrary angle requires general convolution.
    // We will do line sampling.

    // Limit steps to avoid freezing if distance is huge.
    // Ideally sample every pixel.
    const steps = Math.ceil(distance);

    // Helper
    function getPixel(x, y, ch) {
        if (x < 0) x = 0;
        if (x >= width) x = width - 1;
        if (y < 0) y = 0;
        if (y >= height) y = height - 1;

        // Nearest neighbor
        const ix = Math.round(x);
        const iy = Math.round(y);
        return data[(iy * width + ix) * 4 + ch];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let rSum = 0;
            let gSum = 0;
            let bSum = 0;
            let aSum = 0;
            let count = 0;

            // Center the blur? Or trail?
            // "Motion Blur" usually means the pixel smears.
            // Often centered: from -distance/2 to +distance/2

            const start = -steps / 2;
            const end = steps / 2;

            for (let i = start; i <= end; i++) {
                const sampleX = x + dirX * i;
                const sampleY = y + dirY * i;

                // Check bounds before sampling if we want strict bounds
                // But clamping is handled by helper.

                if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
                    const sx = Math.round(sampleX);
                    const sy = Math.round(sampleY);
                    const idx = (sy * width + sx) * 4;

                    rSum += data[idx];
                    gSum += data[idx+1];
                    bSum += data[idx+2];
                    aSum += data[idx+3];
                    count++;
                }
            }

            const idx = (y * width + x) * 4;
            if (count > 0) {
                resultBuffer[idx] = rSum / count;
                resultBuffer[idx+1] = gSum / count;
                resultBuffer[idx+2] = bSum / count;
                resultBuffer[idx+3] = aSum / count;
            } else {
                 // Should not happen if x,y inside
                resultBuffer[idx] = data[idx];
                resultBuffer[idx+1] = data[idx+1];
                resultBuffer[idx+2] = data[idx+2];
                resultBuffer[idx+3] = data[idx+3];
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
