// Affine Transform - Worker Thread

self.onmessage = function(e) {
    if (e.data.type === 'transform') {
        const { imageData, params } = e.data;
        const result = applyAffine(imageData, params);
        self.postMessage({
            type: 'result',
            ...result
        });
    }
};

function applyAffine(srcImageData, params) {
    const startTime = performance.now();

    const { sx, sy, rot, shx, shy } = params;
    const srcData = new Uint8ClampedArray(srcImageData.data);
    const w = srcImageData.width;
    const h = srcImageData.height;

    // Calculate transformation matrix M
    // M = Translation(cx, cy) * Rotate * Scale * Shear * Translation(-cx, -cy)
    // To keep image centered
    const cx = w / 2;
    const cy = h / 2;

    // Matrix multiplication helper
    // [a c tx]
    // [b d ty]
    // [0 0 1 ]

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    // Rotation
    // a = cos, c = -sin
    // b = sin, d = cos

    // Scale
    // a *= sx, d *= sy

    // Shear
    // New x = x + shx * y
    // New y = y + shy * x

    // Let's compose manually:
    // 1. Center to origin: x' = x - cx, y' = y - cy
    // 2. Shear: x'' = x' + shx*y', y'' = y' + shy*x'
    // 3. Scale: x''' = sx*x'', y''' = sy*y''
    // 4. Rotate: x'''' = x'''*cos - y'''*sin, y'''' = x'''*sin + y'''*cos
    // 5. Uncenter: x_out = x'''' + cx, y_out = y'''' + cy

    // Combined forward matrix M:
    // This maps Source (u,v) -> Dest (x,y)

    // Inverse Mapping is needed: Dest (x,y) -> Source (u,v)
    // To fill destination image, iterate x,y and find u,v.
    // Inverse of operations in reverse order:
    // 1. Center: x' = x - cx, y' = y - cy
    // 2. Inverse Rotate: x'' = x'*cos + y'*sin, y'' = -x'*sin + y'*cos
    // 3. Inverse Scale: x''' = x''/sx, y''' = y''/sy
    // 4. Inverse Shear:
    //    System: x''' = u + shx*v, y''' = shy*u + v
    //    Solve for u, v.
    //    Det = 1 - shx*shy
    //    u = (x''' - shx*y''') / Det
    //    v = (y''' - shy*x''') / Det
    // 5. Uncenter: u_final = u + cx, v_final = v + cy

    // Calculate bounds of the transformed image to resize canvas if needed?
    // For this example, let's keep canvas size same or fit?
    // Let's keep canvas size same but clamp/fill background for simplicity, or expand?
    // Expanding is better.

    // Calculate 4 corners in Dest space to find bounding box
    // But since we use inverse mapping, we just need to know the bounding box of the transformed source rect.
    // Forward transform corners of source (0,0), (w,0), (w,h), (0,h)

    function forward(x, y) {
        let dx = x - cx;
        let dy = y - cy;

        // Shear
        let sx_ = dx + shx * dy;
        let sy_ = dy + shy * dx;

        // Scale
        sx_ *= sx;
        sy_ *= sy;

        // Rotate
        let rx = sx_ * cos - sy_ * sin;
        let ry = sx_ * sin + sy_ * cos;

        return { x: rx + cx, y: ry + cy };
    }

    const c1 = forward(0, 0);
    const c2 = forward(w, 0);
    const c3 = forward(w, h);
    const c4 = forward(0, h);

    const minX = Math.floor(Math.min(c1.x, c2.x, c3.x, c4.x));
    const maxX = Math.ceil(Math.max(c1.x, c2.x, c3.x, c4.x));
    const minY = Math.floor(Math.min(c1.y, c2.y, c3.y, c4.y));
    const maxY = Math.ceil(Math.max(c1.y, c2.y, c3.y, c4.y));

    const destW = maxX - minX;
    const destH = maxY - minY;

    const destData = new Uint8ClampedArray(destW * destH * 4);

    // Precompute Inverse constants
    const detShear = 1 - shx * shy;
    const invDetShear = (detShear !== 0) ? 1 / detShear : 0;

    for (let y = 0; y < destH; y++) {
        for (let x = 0; x < destW; x++) {
            // Coordinate in Destination Image Space (relative to top-left of bbox)
            // Actual coord in 'space' is (x + minX, y + minY)

            const px = x + minX;
            const py = y + minY;

            // 1. Center
            const dx = px - cx;
            const dy = py - cy;

            // 2. Inverse Rotate
            const rx = dx * cos + dy * sin;
            const ry = -dx * sin + dy * cos;

            // 3. Inverse Scale
            const sx_ = rx / sx;
            const sy_ = ry / sy;

            // 4. Inverse Shear
            let u, v;
            if (detShear === 0) {
                u = -9999; v = -9999; // Degenerate
            } else {
                u = (sx_ - shx * sy_) * invDetShear;
                v = (sy_ - shy * sx_) * invDetShear;
            }

            // 5. Uncenter
            const srcX = u + cx;
            const srcY = v + cy;

            const destIdx = (y * destW + x) * 4;

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
                // Background (transparent)
                destData[destIdx + 3] = 0;
            }
        }
    }

    return {
        imageData: destData.buffer,
        width: destW,
        height: destH,
        executionTime: performance.now() - startTime
    };
}
