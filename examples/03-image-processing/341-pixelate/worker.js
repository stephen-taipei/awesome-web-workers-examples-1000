self.onmessage = function(e) {
    const { imageData, blockSize } = e.data;
    const startTime = performance.now();

    const pixelatedData = pixelate(imageData, blockSize);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: pixelatedData,
            time: Math.round(endTime - startTime)
        }
    });
};

function pixelate(imageData, blockSize) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const outputBuffer = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {

            // Calculate block dimensions (handle edges)
            const blockW = Math.min(blockSize, width - x);
            const blockH = Math.min(blockSize, height - y);

            let rTotal = 0, gTotal = 0, bTotal = 0, aTotal = 0;
            let count = 0;

            // Average color of the block
            for (let by = 0; by < blockH; by++) {
                for (let bx = 0; bx < blockW; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    rTotal += data[idx];
                    gTotal += data[idx + 1];
                    bTotal += data[idx + 2];
                    aTotal += data[idx + 3];
                    count++;
                }
            }

            const rAvg = Math.round(rTotal / count);
            const gAvg = Math.round(gTotal / count);
            const bAvg = Math.round(bTotal / count);
            const aAvg = Math.round(aTotal / count);

            // Fill block with average color
            for (let by = 0; by < blockH; by++) {
                for (let bx = 0; bx < blockW; bx++) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    outputBuffer[idx] = rAvg;
                    outputBuffer[idx + 1] = gAvg;
                    outputBuffer[idx + 2] = bAvg;
                    outputBuffer[idx + 3] = aAvg;
                }
            }
        }

        if (y % (blockSize * 5) === 0) {
            self.postMessage({ type: 'progress', data: (y / height) * 100 });
        }
    }

    self.postMessage({ type: 'progress', data: 100 });
    return new ImageData(outputBuffer, width, height);
}
