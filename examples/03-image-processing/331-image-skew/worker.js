// Image Skew - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    if (type === 'process') {
        try {
            const result = applySkew(imageData, params);
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

function applySkew(imageData, params) {
    const startTime = performance.now();
    const { width: srcW, height: srcH, data: srcData } = imageData;
    const { skewX, skewY } = params;

    const radX = skewX * Math.PI / 180;
    const radY = skewY * Math.PI / 180;
    const tanX = Math.tan(radX);
    const tanY = Math.tan(radY);

    // Calculate new bounds
    // Corners: (0,0), (w,0), (0,h), (w,h)
    // Map to:
    // x' = x + y * tanX
    // y' = y + x * tanY

    const corners = [
        { x: 0, y: 0 },
        { x: srcW, y: 0 },
        { x: 0, y: srcH },
        { x: srcW, y: srcH }
    ];

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    corners.forEach(p => {
        const nx = p.x + p.y * tanX;
        const ny = p.y + p.x * tanY;
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
    });

    const outW = Math.ceil(maxX - minX);
    const outH = Math.ceil(maxY - minY);
    const offsetX = -minX;
    const offsetY = -minY;

    const buffer = new ArrayBuffer(outW * outH * 4);
    const outputData = new Uint8ClampedArray(buffer);
    const progressInterval = Math.floor(outH / 20);

    // Inverse mapping
    // x' = x + y * tanX
    // y' = y + x * tanY
    // Solve for x, y
    // x' = x + (y' - x*tanY) * tanX
    // x' = x + y'tanX - x*tanY*tanX
    // x' - y'tanX = x * (1 - tanX*tanY)
    // x = (x' - y'tanX) / (1 - tanX*tanY)
    // Similarly for y

    const denom = 1 - tanX * tanY;

    for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
            const destIndex = (y * outW + x) * 4;

            // Map to original coord space (subtract offset)
            const dx = x - offsetX;
            const dy = y - offsetY;

            // Inverse transform
            let srcX, srcY;

            if (Math.abs(denom) < 1e-6) {
                // Singular matrix (e.g. 45 degrees both ways?)
                srcX = -1;
                srcY = -1;
            } else {
                srcX = (dx - dy * tanX) / denom;
                srcY = (dy - dx * tanY) / denom;
            }

            // Bilinear Sample
            const x0 = Math.floor(srcX);
            const x1 = x0 + 1;
            const y0 = Math.floor(srcY);
            const y1 = y0 + 1;

            if (x0 >= 0 && x1 < srcW && y0 >= 0 && y1 < srcH) {
                const wx = srcX - x0;
                const wy = srcY - y0;

                const i00 = (y0 * srcW + x0) * 4;
                const i10 = (y0 * srcW + x1) * 4;
                const i01 = (y1 * srcW + x0) * 4;
                const i11 = (y1 * srcW + x1) * 4;

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
                // Transparent
                outputData[destIndex + 3] = 0;
            }
        }

        if (y % progressInterval === 0) {
            self.postMessage({
                type: 'progress',
                data: { percent: Math.round((y / outH) * 100) }
            });
        }
    }

    const executionTime = performance.now() - startTime;

    return {
        processedData: outputData.buffer,
        width: outW,
        height: outH,
        executionTime
    };
}
