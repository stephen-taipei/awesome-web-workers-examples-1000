self.onmessage = function(e) {
    const { imageData, extendRatio, blendWidth } = e.data;
    const { width, height, data } = imageData;

    const newWidth = Math.floor(width * extendRatio);
    const extraWidth = newWidth - width;
    const leftExtra = Math.floor(extraWidth / 2);
    const blendPixels = Math.floor(width * blendWidth * 0.3);

    const output = new Uint8ClampedArray(newWidth * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < newWidth; x++) {
            const dstIdx = (y * newWidth + x) * 4;

            if (x < leftExtra) {
                // Left extension - mirror and blend
                const srcX = leftExtra - x;
                const srcIdx = (y * width + Math.min(srcX, width - 1)) * 4;
                const blend = x < blendPixels ? x / blendPixels : 1;

                // Get edge color for smooth transition
                const edgeIdx = (y * width) * 4;
                output[dstIdx] = data[srcIdx] * blend + data[edgeIdx] * (1 - blend);
                output[dstIdx + 1] = data[srcIdx + 1] * blend + data[edgeIdx + 1] * (1 - blend);
                output[dstIdx + 2] = data[srcIdx + 2] * blend + data[edgeIdx + 2] * (1 - blend);
                output[dstIdx + 3] = 255;
            } else if (x >= leftExtra + width) {
                // Right extension - mirror and blend
                const distFromEdge = x - (leftExtra + width);
                const srcX = width - 1 - distFromEdge;
                const srcIdx = (y * width + Math.max(0, srcX)) * 4;
                const blend = distFromEdge < blendPixels ? 1 - distFromEdge / blendPixels : 0;

                const edgeIdx = (y * width + width - 1) * 4;
                output[dstIdx] = data[srcIdx] * (1 - blend) + data[edgeIdx] * blend;
                output[dstIdx + 1] = data[srcIdx + 1] * (1 - blend) + data[edgeIdx + 1] * blend;
                output[dstIdx + 2] = data[srcIdx + 2] * (1 - blend) + data[edgeIdx + 2] * blend;
                output[dstIdx + 3] = 255;
            } else {
                // Original image area
                const srcX = x - leftExtra;
                const srcIdx = (y * width + srcX) * 4;
                output[dstIdx] = data[srcIdx];
                output[dstIdx + 1] = data[srcIdx + 1];
                output[dstIdx + 2] = data[srcIdx + 2];
                output[dstIdx + 3] = 255;
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, newWidth, height),
        newWidth,
        newHeight: height
    });
};
