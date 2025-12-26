self.onmessage = function(e) {
    const { imageData, angle, interpolation } = e.data;
    const startTime = performance.now();

    const srcWidth = imageData.width;
    const srcHeight = imageData.height;
    const srcData = imageData.data;

    // Convert angle to radians
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Calculate bounding box for rotated image
    // Corners relative to center
    // We rotate around center of source image
    const cx = srcWidth / 2;
    const cy = srcHeight / 2;

    // 4 Corners: (0,0), (w,0), (0,h), (w,h)
    // Map to new coords relative to center (0,0) -> (-cx, -cy)
    // Then rotate

    const corners = [
        { x: -cx, y: -cy },
        { x: srcWidth - cx, y: -cy },
        { x: -cx, y: srcHeight - cy },
        { x: srcWidth - cx, y: srcHeight - cy }
    ];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    corners.forEach(p => {
        const nx = p.x * cos - p.y * sin;
        const ny = p.x * sin + p.y * cos;
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
    });

    const dstWidth = Math.ceil(maxX - minX);
    const dstHeight = Math.ceil(maxY - minY);

    // Center of destination image
    const dstCx = dstWidth / 2;
    const dstCy = dstHeight / 2;

    const dstData = new Uint8ClampedArray(dstWidth * dstHeight * 4);

    // Inverse mapping: iterate over destination pixels, map back to source
    // dst(x,y) corresponds to src(u,v)
    // Inverse rotation: -angle
    // u = (x - dstCx) * cos(-rad) - (y - dstCy) * sin(-rad) + cx
    // v = (x - dstCx) * sin(-rad) + (y - dstCy) * cos(-rad) + cy
    // cos(-a) = cos(a), sin(-a) = -sin(a)

    // So:
    // u = (x - dstCx) * cos + (y - dstCy) * sin + cx
    // v = -(x - dstCx) * sin + (y - dstCy) * cos + cy

    for (let y = 0; y < dstHeight; y++) {
        if (y % 50 === 0) self.postMessage({ type: 'progress', progress: (y / dstHeight) * 100 });

        const yOff = y - dstCy;
        const yCos = yOff * cos;
        const ySin = yOff * sin;

        for (let x = 0; x < dstWidth; x++) {
            const xOff = x - dstCx;

            // Map back to source coordinates
            const u = xOff * cos + ySin + cx;
            const v = -xOff * sin + yCos + cy;

            // Check bounds
            if (u >= 0 && u < srcWidth - 1 && v >= 0 && v < srcHeight - 1) {
                const dstIdx = (y * dstWidth + x) * 4;

                if (interpolation === 'bilinear') {
                    const u1 = Math.floor(u);
                    const v1 = Math.floor(v);
                    const u2 = u1 + 1;
                    const v2 = v1 + 1;

                    const du = u - u1;
                    const dv = v - v1;
                    const one_du = 1 - du;
                    const one_dv = 1 - dv;

                    const w1 = one_du * one_dv;
                    const w2 = du * one_dv;
                    const w3 = one_du * dv;
                    const w4 = du * dv;

                    const i1 = (v1 * srcWidth + u1) * 4;
                    const i2 = (v1 * srcWidth + u2) * 4;
                    const i3 = (v2 * srcWidth + u1) * 4;
                    const i4 = (v2 * srcWidth + u2) * 4;

                    dstData[dstIdx] = w1*srcData[i1] + w2*srcData[i2] + w3*srcData[i3] + w4*srcData[i4];
                    dstData[dstIdx+1] = w1*srcData[i1+1] + w2*srcData[i2+1] + w3*srcData[i3+1] + w4*srcData[i4+1];
                    dstData[dstIdx+2] = w1*srcData[i1+2] + w2*srcData[i2+2] + w3*srcData[i3+2] + w4*srcData[i4+2];
                    dstData[dstIdx+3] = w1*srcData[i1+3] + w2*srcData[i2+3] + w3*srcData[i3+3] + w4*srcData[i4+3];
                } else {
                    // Nearest neighbor
                    const uInt = Math.round(u);
                    const vInt = Math.round(v);

                    if (uInt >= 0 && uInt < srcWidth && vInt >= 0 && vInt < srcHeight) {
                         const srcIdx = (vInt * srcWidth + uInt) * 4;
                         dstData[dstIdx] = srcData[srcIdx];
                         dstData[dstIdx+1] = srcData[srcIdx+1];
                         dstData[dstIdx+2] = srcData[srcIdx+2];
                         dstData[dstIdx+3] = srcData[srcIdx+3];
                    }
                }
            }
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(dstData, dstWidth, dstHeight),
        duration: Math.round(endTime - startTime)
    });
};
