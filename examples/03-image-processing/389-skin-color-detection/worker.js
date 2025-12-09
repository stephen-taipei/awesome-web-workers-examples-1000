self.onmessage = function(e) {
    const { imageData, mode } = e.data;
    const startTime = performance.now();

    try {
        const { width, height, data } = imageData;
        const totalPixels = width * height;
        let skinPixels = 0;

        // Output buffer
        const outputData = new Uint8ClampedArray(data.length);

        for (let i = 0; i < totalPixels; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const a = data[i * 4 + 3];

            // RGB to YCbCr conversion
            // Y  =  0.299R + 0.587G + 0.114B
            // Cb = -0.169R - 0.331G + 0.500B + 128
            // Cr =  0.500R - 0.419G - 0.081B + 128

            const Y  =  0.299 * r + 0.587 * g + 0.114 * b;
            const Cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
            const Cr =  0.5 * r - 0.4187 * g - 0.0813 * b + 128;

            // Skin Color Threshold
            // Cb: [77, 127]
            // Cr: [133, 173]
            const isSkin = (Cb >= 77 && Cb <= 127) && (Cr >= 133 && Cr <= 173);

            if (isSkin) skinPixels++;

            // Render Output based on mode
            if (mode === 'mask') {
                const val = isSkin ? 255 : 0;
                outputData[i * 4] = val;     // R
                outputData[i * 4 + 1] = val; // G
                outputData[i * 4 + 2] = val; // B
                outputData[i * 4 + 3] = 255; // Alpha
            } else if (mode === 'extract') {
                if (isSkin) {
                    outputData[i * 4] = r;
                    outputData[i * 4 + 1] = g;
                    outputData[i * 4 + 2] = b;
                    outputData[i * 4 + 3] = a;
                } else {
                    // Transparent or Black
                    outputData[i * 4] = 0;
                    outputData[i * 4 + 1] = 0;
                    outputData[i * 4 + 2] = 0;
                    outputData[i * 4 + 3] = 255; // Show black background
                }
            } else if (mode === 'overlay') {
                if (isSkin) {
                    // Highlight skin in original color or tint? Let's keep original
                    outputData[i * 4] = r;
                    outputData[i * 4 + 1] = g;
                    outputData[i * 4 + 2] = b;
                } else {
                    // Dim non-skin areas
                    outputData[i * 4] = r * 0.3;
                    outputData[i * 4 + 1] = g * 0.3;
                    outputData[i * 4 + 2] = b * 0.3;
                }
                outputData[i * 4 + 3] = a;
            }
        }

        // Morphological Closing (Dilation then Erosion) to fill holes
        // Implementation omitted for simplicity in this basic version, but recommended for better results.
        // If we wanted to add it, we would need a temporary buffer.

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: new ImageData(outputData, width, height),
                time: Math.round(endTime - startTime),
                ratio: skinPixels / totalPixels
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};
