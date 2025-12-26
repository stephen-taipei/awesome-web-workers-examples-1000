self.onmessage = function(e) {
    const { imageData, highlightEV, shadowEV } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const highlightMult = Math.pow(2, highlightEV);
    const shadowMult = Math.pow(2, shadowEV);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Calculate blend weight based on luminance
        // Shadows get shadow adjustment, highlights get highlight adjustment
        const shadowWeight = Math.pow(1 - luminance, 2);
        const highlightWeight = Math.pow(luminance, 2);
        const midWeight = 1 - shadowWeight - highlightWeight;

        // Apply exposure adjustments
        const shadowR = Math.min(255, r * shadowMult);
        const shadowG = Math.min(255, g * shadowMult);
        const shadowB = Math.min(255, b * shadowMult);

        const highlightR = Math.min(255, r * highlightMult);
        const highlightG = Math.min(255, g * highlightMult);
        const highlightB = Math.min(255, b * highlightMult);

        // Blend based on luminance
        output[i] = shadowR * shadowWeight + r * midWeight + highlightR * highlightWeight;
        output[i + 1] = shadowG * shadowWeight + g * midWeight + highlightG * highlightWeight;
        output[i + 2] = shadowB * shadowWeight + b * midWeight + highlightB * highlightWeight;
        output[i + 3] = 255;
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
