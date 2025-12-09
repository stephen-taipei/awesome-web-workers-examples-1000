// Spherize - Worker Thread

self.onmessage = function(e) {
    if (e.data.type === 'spherize') {
        const { imageData, params } = e.data;
        const result = applySpherize(imageData, params);
        self.postMessage({
            type: 'result',
            ...result
        });
    }
};

function applySpherize(srcImageData, params) {
    const startTime = performance.now();

    const { strength, cx, cy, radius } = params;
    const w = srcImageData.width;
    const h = srcImageData.height;
    const srcData = new Uint8ClampedArray(srcImageData.data);
    const destData = new Uint8ClampedArray(w * h * 4);

    const centerX = cx * w;
    const centerY = cy * h;
    const maxRadius = radius * Math.min(w, h);
    const maxRadiusSq = maxRadius * maxRadius;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const destIdx = (y * w + x) * 4;

            const dx = x - centerX;
            const dy = y - centerY;
            const distSq = dx * dx + dy * dy;

            if (distSq >= maxRadiusSq) {
                // Outside effect radius, copy original
                const srcIdx = destIdx;
                destData[destIdx] = srcData[srcIdx];
                destData[destIdx+1] = srcData[srcIdx+1];
                destData[destIdx+2] = srcData[srcIdx+2];
                destData[destIdx+3] = srcData[srcIdx+3];
                continue;
            }

            // Inside radius: Spherize
            // Formula: r_new = r * (1 + strength * (1 - r/radius)^2) ??
            // Or simple fisheye: r_src = r_dest / (1 - strength * r_dest^2) ?

            // Let's use a standard formula
            const dist = Math.sqrt(distSq);
            let factor;

            // Normalize distance (0 to 1 within radius)
            const r = dist / maxRadius;

            // Refraction effect
            // z = sqrt(1 - r^2)
            // refraction angle...

            // Simple power function for displacement
            // if strength > 0 (bulge), we need to sample from closer to center (smaller r_src)
            // No, wait. Bulge means pixels push OUT. So pixel at dest(r) comes from src(r_src) where r_src < r.

            // Formula: src_r = r * (1 - strength * (1 - r)^2) ??

            // Common formula:
            // theta = asin(r)
            // src_r = theta (if normalizing 90 deg)

            // Let's try this interpolation:
            // k = strength
            // if k > 0: bulge. r_src = r * (1 - k * (1 - r*r))  ?

            // Let's use:
            // z = sqrt(1 - r^2)
            // r_src = asin(r) * (2/PI) ... this is for sphere projection

            // Let's use a simple polynomial distortion
            // r_dest is r (0..1)
            // if strength > 0: r_src = r ^ (1 - strength * 0.5)
            // if strength < 0: r_src = r ^ (1 - strength * 0.5) (pinch)

            // Let's assume strength is -1 to 1.
            // 0 -> No change
            // 1 -> Bulge
            // -1 -> Pinch

            // Correction formula:
            // r_src = r + (r^3 - r) * strength ?

            let rSrc;
            if (dist < 0.001) {
                rSrc = 0;
            } else {
                // Non-linear mapping
                // Using 1 - strength * (1-r)^2
                if (strength >= 0) {
                     // Bulge: we want r_src < r
                     rSrc = r * (1 - strength * (r - 1) * (r - 1));
                } else {
                     // Pinch: we want r_src > r
                     rSrc = r * (1 - strength * (1 - r) * (1 - r)); // strength is negative, so 1 + |s|... > 1
                     // Wait, Pinch means we see MORE, so we pull pixels from FURTHER away. r_src > r.
                }
            }

            const distSrc = rSrc * maxRadius;
            const angle = Math.atan2(dy, dx);

            const srcX = centerX + Math.cos(angle) * distSrc;
            const srcY = centerY + Math.sin(angle) * distSrc;

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
                // Edge handling: Transparent or Repeat or Clamp?
                // Let's Clamp
                /*
                const cx0 = Math.max(0, Math.min(w-1, Math.floor(srcX)));
                const cy0 = Math.max(0, Math.min(h-1, Math.floor(srcY)));
                const idx = (cy0 * w + cx0) * 4;
                destData[destIdx] = srcData[idx]; destData[destIdx+1] = srcData[idx+1]; ...
                */
                // Or transparent
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
