// Cylinderize - Worker Thread

self.onmessage = function(e) {
    if (e.data.type === 'cylinderize') {
        const { imageData, strength, axis } = e.data;
        const result = applyCylinderize(imageData, strength, axis);
        self.postMessage({
            type: 'result',
            ...result
        });
    }
};

function applyCylinderize(srcImageData, strength, axis) {
    const startTime = performance.now();

    const w = srcImageData.width;
    const h = srcImageData.height;
    const srcData = new Uint8ClampedArray(srcImageData.data);
    const destData = new Uint8ClampedArray(w * h * 4);

    const centerX = w / 2;
    const centerY = h / 2;

    // Cylindrical projection.
    // x = r * sin(theta)
    // z = r * cos(theta)
    // y = y

    // Inverse mapping:
    // We iterate destination pixels (screen).
    // The screen represents a plane intersecting the cylinder? Or the unrolled cylinder?
    // "Cylinderize" effect usually means wrapping image ONTO a cylinder.
    // So the flat image looks curved.

    // x_dest is horizontal pos on screen.
    // x_src should be non-linearly mapped.
    // Near center (x=0), x_src changes slowly. Near edges, x_src changes fast?
    // No, if wrapping around cylinder, the edges recede, so pixels get squashed.
    // So 1 pixel in dest covers MORE pixels in src at edges?
    // Or 1 pixel in dest covers LESS pixels in src?

    // Let's assume the View is looking at a cylinder.
    // x_dest = R * sin(theta)
    // x_src (unrolled) = R * theta

    // So theta = asin(x_dest / R)
    // x_src = R * asin(x_dest / R)

    // R depends on image width.
    // Let R = Width / (2 * strength). Strength controls curvature.
    // If strength = 1, R = Width/2. Full semi-circle visible?

    // Let's normalize x from -1 to 1.

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const destIdx = (y * w + x) * 4;

            let u, v; // Normalized Source Coordinates 0..1

            if (axis === 'vertical') {
                // Modifying X based on X
                const nx = (x - centerX) / (w / 2); // -1 to 1

                // If |nx| > 1, outside cylinder?
                // Let's assume cylinder radius allows full width visible if strength is low.
                // x_screen = sin(theta).

                // Effective X on cylinder surface angle
                // If we want simple effect:
                // x_src = asin(nx) / (PI/2) ?

                // Let's use simple distortion:
                // src_x = x_center + (x - x_center) / cos( (x-x_center)/K ) ??

                // Let's stick to asin projection.
                // theta = asin(nx)
                // valid only if -1 <= nx <= 1.
                // if strength reduces radius, effective nx might be larger?

                // Let effective normalized X = nx * strength ?
                // If strength=1, edges are at 90 deg.

                // Let's map screen x to cylinder theta.
                // theta = nx * (PI/2) * strength
                // This maps screen linearly to angle. This produces "Unrolling" effect (fisheye correction).

                // We want "Rolling" effect (flat -> cylinder).
                // Screen X corresponds to physical location on cylinder projected to plane.
                // x_screen = R * sin(theta).
                // x_src = R * theta.

                // So theta = asin(x_screen / R).
                // x_src = R * asin(x_screen / R).

                // If x_screen range is -W/2 to W/2.
                // We need R > W/2 to see valid image.
                // Let R = (W/2) / sin(max_theta).
                // Let max_theta be controlled by strength. E.g., strength=1 => max_theta=PI/2.

                // R = (w/2) / Math.sin(strength * Math.PI / 2);

                const maxAngle = strength * Math.PI / 2; // up to 90 degrees
                if (Math.abs(maxAngle) < 0.001) {
                    u = x / w; v = y / h;
                } else {
                    const R = (w / 2) / Math.sin(maxAngle);
                    const dx = x - centerX;

                    if (Math.abs(dx) > (w/2)) {
                        u = -1; // Out of bounds
                    } else {
                        // Project screen x to theta
                        // dx = R * sin(theta) -> theta = asin(dx / R)
                        // This assumes cylinder is centered at z=0, view at z=inf.

                        // Check if dx/R is valid
                        const ratio = dx / R;
                        if (Math.abs(ratio) > 1) {
                             u = -1;
                        } else {
                            const theta = Math.asin(ratio);
                            // Map theta (-maxAngle to maxAngle) to U (0 to 1)
                            // theta range is approx -maxAngle to maxAngle because dx range is -w/2 to w/2

                            // x_src_dist = R * theta.
                            // But original image is flat width W.
                            // Do we map arc length to W?
                            // Yes. Arc Length = 2 * R * maxAngle = 2 * (w/2)/sin(ma) * ma = w * (ma / sin(ma)) >= w.
                            // So src image is stretched or crop?
                            // Usually we map 0..1 U coord to -maxAngle..maxAngle.

                            // U = (theta + maxAngle) / (2 * maxAngle)
                            u = (theta + maxAngle) / (2 * maxAngle);
                        }
                    }
                    v = y / h;
                }

            } else {
                // Horizontal axis (modifying Y)
                const maxAngle = strength * Math.PI / 2;
                if (Math.abs(maxAngle) < 0.001) {
                    u = x / w; v = y / h;
                } else {
                    const R = (h / 2) / Math.sin(maxAngle);
                    const dy = y - centerY;
                    const ratio = dy / R;

                    if (Math.abs(ratio) > 1) {
                        v = -1;
                    } else {
                        const theta = Math.asin(ratio);
                        v = (theta + maxAngle) / (2 * maxAngle);
                    }
                    u = x / w;
                }
            }

            // Sample
            if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
                const srcX = u * (w - 1);
                const srcY = v * (h - 1);

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
