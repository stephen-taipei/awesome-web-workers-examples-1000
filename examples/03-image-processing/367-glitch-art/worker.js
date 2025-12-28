self.onmessage = function(e) {
    const { imageData, intensity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    const numSlices = Math.floor(10 * intensity);
    for (let i = 0; i < numSlices; i++) {
        const sliceY = Math.floor(Math.random() * height);
        const sliceHeight = Math.floor(Math.random() * 20 * intensity) + 1;
        const offset = Math.floor((Math.random() - 0.5) * 40 * intensity);

        for (let y = sliceY; y < Math.min(sliceY + sliceHeight, height); y++) {
            for (let x = 0; x < width; x++) {
                const srcX = (x + offset + width) % width;
                const srcIdx = (y * width + srcX) * 4;
                const dstIdx = (y * width + x) * 4;

                if (Math.random() < 0.3) {
                    // RGB channel swap
                    output[dstIdx] = data[srcIdx + 2];
                    output[dstIdx + 1] = data[srcIdx];
                    output[dstIdx + 2] = data[srcIdx + 1];
                } else {
                    output[dstIdx] = data[srcIdx];
                    output[dstIdx + 1] = data[srcIdx + 1];
                    output[dstIdx + 2] = data[srcIdx + 2];
                }
            }
        }
    }

    // Add some random color blocks
    const numBlocks = Math.floor(5 * intensity);
    for (let i = 0; i < numBlocks; i++) {
        const bx = Math.floor(Math.random() * width);
        const by = Math.floor(Math.random() * height);
        const bw = Math.floor(Math.random() * 50 * intensity) + 5;
        const bh = Math.floor(Math.random() * 10 * intensity) + 2;
        const color = [Math.random() * 255, Math.random() * 255, Math.random() * 255];

        for (let y = by; y < Math.min(by + bh, height); y++) {
            for (let x = bx; x < Math.min(bx + bw, width); x++) {
                const idx = (y * width + x) * 4;
                output[idx] = color[0];
                output[idx + 1] = color[1];
                output[idx + 2] = color[2];
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
