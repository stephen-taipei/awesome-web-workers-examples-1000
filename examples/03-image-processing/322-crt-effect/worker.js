self.onmessage = function(e) {
    const { imageData, curvature, scanline } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(width * height * 4);

    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Barrel distortion for CRT curvature
            const nx = (x - cx) / cx;
            const ny = (y - cy) / cy;
            const r2 = nx * nx + ny * ny;
            const distortion = 1 + curvature * 0.3 * r2;

            const srcX = Math.round(cx + nx * cx / distortion);
            const srcY = Math.round(cy + ny * cy / distortion);

            const dstIdx = (y * width + x) * 4;

            if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                const srcIdx = (srcY * width + srcX) * 4;

                // Apply scanline effect
                const scanlineFactor = y % 2 === 0 ? 1 : 1 - scanline * 0.3;

                // Vignette effect
                const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                const vignette = 1 - (dist / maxDist) * 0.3;

                output[dstIdx] = data[srcIdx] * scanlineFactor * vignette;
                output[dstIdx + 1] = data[srcIdx + 1] * scanlineFactor * vignette;
                output[dstIdx + 2] = data[srcIdx + 2] * scanlineFactor * vignette;
                output[dstIdx + 3] = 255;
            } else {
                output[dstIdx + 3] = 255;
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
