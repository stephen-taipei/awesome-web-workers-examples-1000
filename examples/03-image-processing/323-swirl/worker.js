// Swirl Effect - Worker Thread

self.onmessage = function(e) {
    if (e.data.type === 'swirl') {
        const { imageData, params } = e.data;
        const result = applySwirl(imageData, params);
        self.postMessage({
            type: 'result',
            ...result
        });
    }
};

function applySwirl(srcImageData, params) {
    const startTime = performance.now();

    const { angle, radius, cx, cy } = params;
    const w = srcImageData.width;
    const h = srcImageData.height;
    const srcData = new Uint8ClampedArray(srcImageData.data);
    const destData = new Uint8ClampedArray(w * h * 4);

    const centerX = cx * w;
    const centerY = cy * h;
    const maxRadius = radius * Math.min(w, h); // effective radius in pixels
    const maxRadiusSq = maxRadius * maxRadius;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const destIdx = (y * w + x) * 4;

            const dx = x - centerX;
            const dy = y - centerY;
            const distSq = dx * dx + dy * dy;

            if (distSq >= maxRadiusSq) {
                // Outside, copy directly
                const srcIdx = destIdx;
                destData[destIdx] = srcData[srcIdx];
                destData[destIdx+1] = srcData[srcIdx+1];
                destData[destIdx+2] = srcData[srcIdx+2];
                destData[destIdx+3] = srcData[srcIdx+3];
                continue;
            }

            const dist = Math.sqrt(distSq);

            // Swirl calculation
            // amount of rotation depends on distance.
            // At center, full angle. At radius, 0 angle.
            // theta = angle * (1 - dist / maxRadius)

            // Inverse mapping:
            // To find color at Dest(x,y), look at Source(u,v).
            // Source is rotated by -theta relative to Dest?
            // If I twist clockwise (pos angle), pixels move clockwise.
            // So Dest pixel comes from Counter-Clockwise position in source.
            // So rotate source coords by -theta.

            const percent = (maxRadius - dist) / maxRadius;
            const theta = percent * percent * angle;

            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            // Rotate (dx, dy)
            const srcDx = dx * cosTheta - dy * sinTheta;
            const srcDy = dx * sinTheta + dy * cosTheta;

            const srcX = centerX + srcDx;
            const srcY = centerY + srcDy;

            // Bilinear Interpolation
            if (srcX >= 0 && srcX < w - 1 && srcY >= 0 && srcY < h - 1) {
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const dx_interp = srcX - x0;
                const dy_interp = srcY - y0;

                const idx00 = (y0 * w + x0) * 4;
                const idx10 = (y0 * w + x0 + 1) * 4;
                const idx01 = ((y0 + 1) * w + x0) * 4;
                const idx11 = ((y0 + 1) * w + x0 + 1) * 4;

                for (let c = 0; c < 4; c++) {
                    const top = srcData[idx00 + c] * (1 - dx_interp) + srcData[idx10 + c] * dx_interp;
                    const bot = srcData[idx01 + c] * (1 - dx_interp) + srcData[idx11 + c] * dx_interp;
                    destData[destIdx + c] = top * (1 - dy_interp) + bot * dy_interp;
                }
            } else {
                destData[destIdx + 3] = 0;
            }
        }
    }

    return {
        imageData: destData.buffer,
        width: w,
        height: h,
        executionTime: performance.now() - startTime
    };
}
