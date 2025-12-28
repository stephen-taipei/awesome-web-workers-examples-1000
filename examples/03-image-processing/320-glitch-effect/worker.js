self.onmessage = function(e) {
    const { imageData, intensity, blocks } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    const blockHeight = Math.floor(height / blocks);
    const maxShift = Math.floor(width * intensity / 100 * 0.2);

    for (let b = 0; b < blocks; b++) {
        if (Math.random() > 0.5) continue;

        const startY = b * blockHeight;
        const endY = Math.min(startY + blockHeight, height);
        const shift = Math.floor((Math.random() - 0.5) * 2 * maxShift);
        const channelShift = Math.floor(Math.random() * 3);

        for (let y = startY; y < endY; y++) {
            for (let x = 0; x < width; x++) {
                const srcX = Math.max(0, Math.min(width - 1, x - shift));
                const srcIdx = (y * width + srcX) * 4;
                const dstIdx = (y * width + x) * 4;

                if (channelShift === 0) {
                    output[dstIdx] = data[srcIdx];
                } else if (channelShift === 1) {
                    output[dstIdx + 1] = data[srcIdx + 1];
                } else {
                    output[dstIdx + 2] = data[srcIdx + 2];
                }
            }
        }
    }

    // Add random noise
    for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < intensity / 500) {
            const noise = Math.random() * 255;
            output[i] = noise;
            output[i + 1] = noise;
            output[i + 2] = noise;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
