// Equirectangular Projection - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    if (type === 'process') {
        try {
            const result = renderView(imageData, params);
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

function renderView(sourceImageData, params) {
    const startTime = performance.now();
    const { width, height, yaw, pitch, fov } = params;

    // Output buffer
    const size = width * height * 4;
    const buffer = new ArrayBuffer(size);
    const outputData = new Uint8ClampedArray(buffer);

    const srcData = sourceImageData.data;
    const srcW = sourceImageData.width;
    const srcH = sourceImageData.height;

    // Camera setup
    const aspect = width / height;
    // FOV in radians
    const fovRad = fov * Math.PI / 180;
    // Distance to projection plane
    const d = 0.5 / Math.tan(fovRad / 2);

    // Rotation matrices based on Yaw and Pitch
    const yawRad = yaw * Math.PI / 180;
    const pitchRad = pitch * Math.PI / 180;

    const cosY = Math.cos(yawRad);
    const sinY = Math.sin(yawRad);
    const cosP = Math.cos(pitchRad);
    const sinP = Math.sin(pitchRad);

    // For each pixel in output view
    for (let y = 0; y < height; y++) {
        // Normalized y coordinate [-0.5, 0.5]
        const v = (y / height) - 0.5;

        for (let x = 0; x < width; x++) {
            // Normalized x coordinate [-0.5 * aspect, 0.5 * aspect]
            const u = ((x / width) - 0.5) * aspect;

            // Ray direction in camera space (z is forward)
            // x right, y down, z forward
            const cx = u;
            const cy = v;
            const cz = d;

            // Rotate ray to world space
            // 1. Rotate Pitch (around X axis)
            // y' = y*cosP - z*sinP
            // z' = y*sinP + z*cosP
            const ry = cy * cosP - cz * sinP;
            const rz_temp = cy * sinP + cz * cosP;

            // 2. Rotate Yaw (around Y axis)
            // x'' = x*cosY + z'*sinY
            // z'' = -x*sinY + z'*cosY
            const rx = cx * cosY + rz_temp * sinY;
            const rz = -cx * sinY + rz_temp * cosY;

            // Convert Cartesian (rx, ry, rz) to Spherical (lat, lon)
            // r = sqrt(x^2 + y^2 + z^2)
            // phi (lat) = asin(y / r)
            // theta (lon) = atan2(x, z)

            const r = Math.sqrt(rx*rx + ry*ry + rz*rz);
            const phi = Math.asin(ry / r);
            const theta = Math.atan2(rx, rz);

            // Map to UV (Equirectangular)
            // u = (theta + PI) / (2 * PI)
            // v = (phi + PI/2) / PI

            let srcU = (theta + Math.PI) / (2 * Math.PI);
            let srcV = (phi + Math.PI / 2) / Math.PI;

            // Handle wrapping
            srcU = srcU % 1.0;
            if (srcU < 0) srcU += 1.0;
            srcV = Math.max(0, Math.min(1, srcV));

            // Map to pixels
            const px = srcU * (srcW - 1);
            const py = srcV * (srcH - 1);

            // Bilinear Sample
            const x0 = Math.floor(px);
            const y0 = Math.floor(py);
            const x1 = (x0 + 1) % srcW; // Wrap x
            const y1 = Math.min(y0 + 1, srcH - 1); // Clamp y

            const wx = px - x0;
            const wy = py - y0;

            const i00 = (y0 * srcW + x0) * 4;
            const i10 = (y0 * srcW + x1) * 4;
            const i01 = (y1 * srcW + x0) * 4;
            const i11 = (y1 * srcW + x1) * 4;

            const destIndex = (y * width + x) * 4;

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
        }
    }

    const executionTime = performance.now() - startTime;

    return {
        processedData: buffer,
        width,
        height,
        executionTime
    };
}
