// Polar Coordinates - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    if (type === 'process') {
        try {
            const result = applyTransform(imageData, params);
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

function applyTransform(imageData, params) {
    const startTime = performance.now();
    const { width: srcW, height: srcH, data: srcData } = imageData;
    const { mode, outWidth, outHeight } = params;

    const buffer = new ArrayBuffer(outWidth * outHeight * 4);
    const outputData = new Uint8ClampedArray(buffer);

    const progressInterval = Math.floor(outHeight / 20);

    const cx = outWidth / 2;
    const cy = outHeight / 2;
    // Radius for Rect->Polar is usually half the output size (assuming square)
    const maxRadius = Math.min(cx, cy);

    const srcCx = srcW / 2;
    const srcCy = srcH / 2;
    const srcMaxRadius = Math.min(srcCx, srcCy);

    for (let y = 0; y < outHeight; y++) {
        for (let x = 0; x < outWidth; x++) {
            const destIndex = (y * outWidth + x) * 4;

            let srcX, srcY;

            if (mode === 'rect-to-polar') {
                // Destination is Polar (Circle). Source is Rect (Strip).
                // But usually "Rect to Polar" means transforming Cartesian (x,y) to Polar (r, theta).
                // Commonly used to make "Little Planets".
                // In "Little Planet":
                // Dest (x, y) -> Polar (r, theta)
                // Map theta -> Source X (0..W)
                // Map r -> Source Y (H..0) usually (Bottom is center)

                const dx = x - cx;
                const dy = y - cy;
                const r = Math.sqrt(dx*dx + dy*dy);
                let theta = Math.atan2(dy, dx); // -PI to PI

                // Map to source
                // X corresponds to Angle
                // Y corresponds to Radius

                // Angle -PI..PI -> 0..srcW
                const u = (theta + Math.PI) / (2 * Math.PI);
                srcX = u * (srcW - 1);

                // Radius 0..maxRadius -> srcH..0 (or 0..srcH)
                // Usually bottom of source image becomes center of planet (r=0)
                // So r=0 -> y=srcH
                // r=maxRadius -> y=0

                const v = r / maxRadius;
                if (v > 1) {
                    // Outside circle
                     outputData[destIndex + 3] = 0; // Transparent
                     continue;
                }

                srcY = (1 - v) * (srcH - 1);

            } else { // polar-to-rect (Unroll)
                // Destination is Rect (Strip). Source is Polar (Circle).
                // x -> Angle
                // y -> Radius

                const u = x / (outWidth - 1); // 0..1 (Angle)
                const v = y / (outHeight - 1); // 0..1 (Radius)
                // Wait, usually top is outer edge, bottom is center? Or vice versa.

                const theta = u * 2 * Math.PI - Math.PI; // -PI to PI
                // If v=0 is top, and we want it to be outer edge?
                // r = v * srcMaxRadius? Or (1-v)?
                // Let's assume y=0 is center (r=0) ? No, strip usually goes left-right.
                // Let's assume y=0 (top) corresponds to max radius (outer edge).
                // y=height (bottom) corresponds to center (r=0).

                const r = (1 - v) * srcMaxRadius;

                srcX = srcCx + r * Math.cos(theta);
                srcY = srcCy + r * Math.sin(theta);
            }

            // Bilinear Sample
            const x0 = Math.floor(srcX);
            const x1 = x0 + 1;
            const y0 = Math.floor(srcY);
            const y1 = y0 + 1;

            // Wrap x for polar stitching?
            // For rect-to-polar: X wraps.
            // For polar-to-rect: Source is circle, clamping/transparent outside.

            let i00, i10, i01, i11;
            let valid = true;

            if (mode === 'rect-to-polar') {
                // X wraps
                const sx0 = (x0 % srcW + srcW) % srcW;
                const sx1 = (x1 % srcW + srcW) % srcW;

                // Y clamps
                const sy0 = Math.max(0, Math.min(srcH-1, y0));
                const sy1 = Math.max(0, Math.min(srcH-1, y1));

                i00 = (sy0 * srcW + sx0) * 4;
                i10 = (sy0 * srcW + sx1) * 4;
                i01 = (sy1 * srcW + sx0) * 4;
                i11 = (sy1 * srcW + sx1) * 4;
            } else {
                // Check bounds
                if (x0 < 0 || x1 >= srcW || y0 < 0 || y1 >= srcH) {
                    valid = false;
                } else {
                    i00 = (y0 * srcW + x0) * 4;
                    i10 = (y0 * srcW + x1) * 4;
                    i01 = (y1 * srcW + x0) * 4;
                    i11 = (y1 * srcW + x1) * 4;
                }
            }

            if (valid) {
                const wx = srcX - x0;
                const wy = srcY - y0;

                for (let c = 0; c < 3; c++) {
                    const val00 = srcData[i00 + c];
                    const val10 = srcData[i10 + c];
                    const val01 = srcData[i01 + c];
                    const val11 = srcData[i11 + c];

                    const top = val00 * (1 - wx) + val10 * wx;
                    const bottom = val01 * (1 - wx) + val11 * wx;
                    const val = top * (1 - wy) + bottom * wy;

                    outputData[destIndex + c] = val;
                }
                outputData[destIndex + 3] = 255;
            } else {
                outputData[destIndex + 3] = 0; // Transparent
            }
        }

        if (y % progressInterval === 0) {
            self.postMessage({
                type: 'progress',
                data: { percent: Math.round((y / outHeight) * 100) }
            });
        }
    }

    const executionTime = performance.now() - startTime;

    return {
        processedData: outputData.buffer,
        width: outWidth,
        height: outHeight,
        executionTime
    };
}
