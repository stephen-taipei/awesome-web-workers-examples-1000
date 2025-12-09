// Fisheye Effect - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    if (type === 'process') {
        try {
            const result = applyFisheyeEffect(imageData, params);
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

function applyFisheyeEffect(imageData, params) {
    const startTime = performance.now();
    const { width, height, data } = imageData;
    const { strength } = params;

    const outputData = new Uint8ClampedArray(data.length);

    // Normalize coordinates to -1 to 1
    // Fisheye center is image center
    const centerX = width / 2;
    const centerY = height / 2;
    // Normalize radius. Use the shorter side to determine the circle.
    // Or longer side? For fisheye, we usually fit the circle to the image or go beyond.
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);
    // Actually, usually we normalize based on diagonal or min dimension.
    // Let's use diagonal radius.

    const progressInterval = Math.floor(height / 20);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const destIndex = (y * width + x) * 4;

            // Normalized coordinates (-1 to 1)
            // But preserving aspect ratio is important?
            // If we normalize x and y independently to -1..1, we get an oval fisheye on non-square images.
            // Usually we want spherical effect.
            // ny = (y - centerY) / centerY
            // nx = (x - centerX) / centerX
            // But let's use a common scaling factor.

            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Maximum distance we care about for normalization
            // Let's say dist at corner is R_max.
            // r = dist / R_max ?
            // Fisheye formula:
            // r_src = s * atan(r_dest / s) ? (Inverse mapping for projection)
            // Standard barrel distortion:
            // r_src = r_dest * (1 + k * r_dest^2)

            // Normalized radius r (0 to 1 at corners)
            // let maxDist = Math.sqrt(centerX*centerX + centerY*centerY);
            // let r = dist / maxDist;
            // If we use maxDist, the corners map to corners.
            // If we use min dimension, corners map to outside (crop).

            // Let's use the shorter dimension to define the "1.0" unit for stronger effect?
            // Or just use pixel distance and scale strength.

            // Common simple implementation:
            // r = dist
            // if r == 0, src = dest
            // theta = atan2(dy, dx)
            // r_src = f(r_dest)
            // If f(r) > r, it's barrel distortion (fisheye). Sample from further out -> squeeze in.
            // If f(r) < r, pincushion.

            // Let's use:
            // r_norm = dist / diagonal_radius
            // r_src_norm = r_norm ^ (strength)  ? No, that's gamma-like

            // Let's use: r_src = r * (1 + strength * (r/radius)^2)
            // But we need to keep inside image.
            // If strength > 0, r_src > r. So we sample from outside image for pixels near edge.
            // This means the image shrinks towards center (Barrel/Fisheye).

            let srcX = x;
            let srcY = y;

            if (dist > 0) {
                // Normalize r to 0..1 at edge of image (min dimension?)
                // If we want the circle to be inscribed, radius = min(w,h)/2.
                // Let's try fitting to image diagonal so we fill the frame mostly, or let user decide.
                // Let's assume radius = diag / 2.
                const maxR = Math.sqrt(centerX*centerX + centerY*centerY);
                const r = dist / maxR; // 0 to 1

                // Fisheye mapping:
                // r_src = r * (1 + strength * r * r) ?
                // If strength is high, r_src grows fast.

                // We want to map dest pixels (r) to source pixels (r_src).
                // If we want fisheye (barrel), we see MORE of the scene.
                // So image content shrinks. Pixels near edge of dest should map to pixels FAR outside source?
                // No, pixels near edge of dest should map to pixels INSIDE source.
                // Wait.
                // If image shrinks, then at dest edge, we see what was originally somewhere else.
                // If we see more scene (fisheye camera), we are mapping a wider FOV to the sensor.
                // If we apply "Fisheye Effect" to a normal image, we simulate that the image WAS taken with fisheye.
                // This means the image should appear BULGED (center magnified, corners compressed? No).

                // Fisheye Image: Straight lines become curved. Center is magnified?
                // Actually, in a fisheye image, the center is relatively magnified compared to edges.
                // Objects in center look huge.
                // So at small r_dest, we sample from small r_src.
                // At large r_dest, we sample from ...
                // Wait, if center is HUGE, it takes up more space in Dest.
                // So a small area in Source maps to large area in Dest.
                // So r_dest > r_src.
                // This means r_src < r_dest.

                // So we need r_src < r_dest (like Bulge).
                // But specifically the mapping function is different.
                // r_src = asin(r_dest) ?

                // Let's implement the standard shader-like fisheye.
                // vec2 uv = xy / size; (0..1)
                // uv = uv * 2.0 - 1.0; (-1..1)
                // float r = length(uv);
                // float theta = atan(uv.y, uv.x);
                // float r_new = pow(r, strength); // Simple power
                // Or r_new = r * (1.0 + strength * r * r); (Barrel?)

                // Let's use 2D power function for simplicity and aesthetic.
                // if strength > 1, r_new < r (if r < 1).
                // wait, if r < 1, r^2 < r.
                // if strength = 2. r=0.5 -> 0.25. (src < dest).
                // This magnifies center.

                // Use a simplified barrel distortion formula that is common for "Fisheye Effect" filters.
                // x' = centerX + (x-centerX) * (1 + strength * r^2) ? No, that scales up.
                // We want to scale DOWN r to find src.
                // r_src = r_dest / (1 + strength * r_norm^2) ?

                // Let's try:
                // normalized distance d = dist / radius (where radius is min dimension / 2)
                // if we use a mapping:
                // src_d = atan(d * strength) / atan(strength) * radius?
                // No, let's stick to polynomial which is faster.
                // factor = 1 / (1 + strength * (dist/maxR)^2)
                // This gives src < dest. Magnification.

                // Wait, user might want to distort the other way too?
                // Let's assume strength > 0 is Fisheye (Barrel).
                // If we want standard barrel distortion (like GoPro), we pull pixels from inside.
                // r_src = r_dest * (1 - k * r^2) ?

                // Let's use the atan formula, it's very "fisheye".
                // r_src = 2 * atan(r_dest/2 * strength) / strength ? (This approximates sin/tan projection)

                // Let's go with simple scaling for now:
                // if strength > 0:
                // factor = 1 + strength * (dist / maxR)^2
                // r_src = r_dest * factor? No, that's Pincushion (shrinks center).

                // We want Fisheye (Bulge).
                // r_src = r_dest / (1 + strength * (dist/maxR)^2) is approximation of sin.

                const factor = 1.0 / (1.0 + strength * (dist / maxR) * (dist / maxR));

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
                // Black
                outputData[destIndex + 3] = 255;
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
