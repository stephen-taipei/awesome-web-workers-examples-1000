// Lens Distortion Correction - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    if (type === 'process') {
        try {
            const result = applyLensCorrection(imageData, params);
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

function applyLensCorrection(imageData, params) {
    const startTime = performance.now();
    const { width, height, data } = imageData;
    const { k1, k2, scale } = params;

    const outputData = new Uint8ClampedArray(data.length);

    const centerX = width / 2;
    const centerY = height / 2;
    // Normalize radius relative to half of the diagonal
    const maxR = Math.sqrt(centerX * centerX + centerY * centerY);

    const progressInterval = Math.floor(height / 20);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const destIndex = (y * width + x) * 4;

            // Normalize dest coordinates (-1 to 1 based on maxR or just distance?)
            // Standard Brown-Conrady uses r relative to image size.
            // Let's use distance from center normalized by maxR (center to corner = 1).

            const dx = (x - centerX);
            const dy = (y - centerY);
            const r_dest = Math.sqrt(dx*dx + dy*dy) / maxR;

            // Apply distortion model
            // To correct distortion, we map the destination (undistorted) pixel back to the source (distorted) pixel.
            // This means we are simulating the distortion to find where the pixel CAME from.
            // The formula r_src = r_dest * (1 + k1*r^2 + k2*r^4) describes the physical distortion.
            // So if k1 > 0 (Barrel), r_src > r_dest. We sample from further out.
            // Wait, Barrel means image bulges out. Straight lines curve out.
            // If we have a Barrel distorted image, and we want to undistort it (Pincushion correction),
            // we want to pull pixels in? Or push them out?
            // To correct Barrel (bulge), we need to shrink the center or expand the edges.
            // We need to map dest (straight) to src (curved).

            // If src is Barrel (bulged), a point that should be at r=0.5 is actually at r=0.6.
            // So to fill dest at r=0.5, we must look at src r=0.6.
            // So r_src > r_dest.
            // The formula r_src = r_dest * (1 + k*r^2) with k>0 gives r_src > r_dest.
            // This fits "Barrel Distortion".

            // So if we have a Barrel distorted image, we use positive k to correct it?
            // "Lens Correction" usually asks for coefficients of the lens.
            // If lens has Barrel distortion (k>0), we use the SAME formula to map dest (ideal) to src (distorted).
            // So k1 should be positive to correct Barrel distortion.

            // BUT, usually "Correction" implies user inputs "Strength" where + fixes Barrel, - fixes Pincushion.
            // If user inputs k1, let's assume it matches the distortion of the source.

            const r2 = r_dest * r_dest;
            const r4 = r2 * r2;

            // Factor to map dest radius to src radius
            // We also apply scaling to avoid cropping (zoom in/out)
            // r_src = r_dest * (1 + k1*r^2 + k2*r^4) * (1/scale)

            const factor = (1 + k1 * r2 + k2 * r4) / scale;

            const srcX = centerX + dx * factor;
            const srcY = centerY + dy * factor;

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
                // Black/Transparent
                outputData[destIndex + 3] = 255; // Alpha
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
