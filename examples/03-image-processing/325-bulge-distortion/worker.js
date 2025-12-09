// Bulge Distortion - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    if (type === 'process') {
        try {
            const result = applyBulgeDistortion(imageData, params);
            self.postMessage({
                type: 'result',
                data: result
            });
        } catch (error) {
            self.postMessage({
                type: 'error',
                data: { error: error.message }
            });
        }
    }
};

function applyBulgeDistortion(imageData, params) {
    const startTime = performance.now();
    const { width, height, data } = imageData;
    const { strength, radius, centerX, centerY } = params;

    const outputData = new Uint8ClampedArray(data.length);
    const radiusSq = radius * radius;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    const progressInterval = Math.floor(height / 20);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const destIndex = (y * width + x) * 4;

            const dx = x - centerX;
            const dy = y - centerY;
            const distanceSq = dx * dx + dy * dy;

            let srcX = x;
            let srcY = y;

            if (distanceSq < radiusSq && distanceSq > 0) {
                const distance = Math.sqrt(distanceSq);
                const d = distance / radius;

                // Bulge formula: Push pixels away from center in source (so center in dest looks bigger)
                // Actually, "Bulge" means center of dest samples from CLOSER to center of source.
                // So factor < 1.

                // If Strength is 1, d=0 -> factor = 0? (Extreme bulge, single point expands to radius)
                // Let's model:
                // factor = (1 - strength * (1-d)^2) ?
                // If strength = 0.5, d=0, factor = 0.5. Source sampled at 0.5 distance.
                // If d=1, factor = 1.

                const factor = 1 - strength * Math.pow((1 - d), 2);

                srcX = centerX + dx * factor;
                srcY = centerY + dy * factor;
            }

            // Bilinear Interpolation
            const x0 = Math.floor(srcX);
            const x1 = x0 + 1;
            const y0 = Math.floor(srcY);
            const y1 = y0 + 1;

            const wx = srcX - x0;
            const wy = srcY - y0;

            if (x0 >= 0 && x1 < width && y0 >= 0 && y1 < height) {
                const i00 = (y0 * width + x0) * 4;
                const i10 = (y0 * width + x1) * 4;
                const i01 = (y1 * width + x0) * 4;
                const i11 = (y1 * width + x1) * 4;

                for (let c = 0; c < 3; c++) {
                    const val00 = data[i00 + c];
                    const val10 = data[i10 + c];
                    const val01 = data[i01 + c];
                    const val11 = data[i11 + c];

                    const top = val00 * (1 - wx) + val10 * wx;
                    const bottom = val01 * (1 - wx) + val11 * wx;
                    const val = top * (1 - wy) + bottom * wy;

                    outputData[destIndex + c] = val;
                }
                outputData[destIndex + 3] = 255;
            } else {
                // Should handle boundary if factor pushes src outside (unlikely for bulge as factor <= 1)
                // But float precision might cause slight issues.
                const cx = clamp(srcX, 0, width - 1);
                const cy = clamp(srcY, 0, height - 1);
                const i = (Math.floor(cy) * width + Math.floor(cx)) * 4;

                outputData[destIndex] = data[i];
                outputData[destIndex + 1] = data[i + 1];
                outputData[destIndex + 2] = data[i + 2];
                outputData[destIndex + 3] = data[i + 3];
            }
        }

        if (y % progressInterval === 0) {
            self.postMessage({
                type: 'progress',
                data: { percent: Math.round((y / height) * 100) }
            });
        }
    }

    const executionTime = performance.now() - startTime;

    return {
        processedData: outputData.buffer,
        executionTime
    };
}
