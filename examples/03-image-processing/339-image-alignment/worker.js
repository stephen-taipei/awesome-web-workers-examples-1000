self.onmessage = function(e) {
    const { ref, target } = e.data;
    const w = ref.width;
    const h = ref.height;

    // We limit search range to +/- 10% of image size
    const rangeX = Math.floor(w * 0.1);
    const rangeY = Math.floor(h * 0.1);

    // Convert to grayscale for speed
    const refGray = new Uint8Array(w * h);
    const targetGray = new Uint8Array(w * h);

    function toGray(src, dest) {
        for (let i = 0; i < w*h; i++) {
            dest[i] = (src.data[i*4] + src.data[i*4+1] + src.data[i*4+2]) / 3;
        }
    }

    toGray(ref, refGray);
    toGray(target, targetGray);

    // Coarse-to-fine or just coarse with step?
    // Let's do a simple pyramid approach manually or just step search.
    // Step search: check every 4th pixel, then refine.

    let bestX = 0;
    let bestY = 0;
    let minDiff = Infinity;

    const step = 4;

    for (let dy = -rangeY; dy <= rangeY; dy += step) {
        for (let dx = -rangeX; dx <= rangeX; dx += step) {
            // Compute difference (SAD) in overlapping region
            let diff = 0;
            let count = 0;

            // Region intersection
            // Ref: [0, w], Target: [dx, dx+w]
            // Intersect X: [max(0, dx), min(w, w+dx)]
            const startX = Math.max(0, dx);
            const endX = Math.min(w, w + dx);
            const startY = Math.max(0, dy);
            const endY = Math.min(h, h + dy);

            if (startX >= endX || startY >= endY) continue;

            // Sample sparsely for speed inside the loop too
            for (let y = startY; y < endY; y += 4) {
                for (let x = startX; x < endX; x += 4) {
                    const rVal = refGray[y*w + x];
                    const tVal = targetGray[(y-dy)*w + (x-dx)];
                    diff += Math.abs(rVal - tVal);
                    count++;
                }
            }

            if (count > 0) {
                const avgDiff = diff / count;
                if (avgDiff < minDiff) {
                    minDiff = avgDiff;
                    bestX = dx;
                    bestY = dy;
                }
            }
        }
    }

    // Refine phase (search +/- step around bestX)
    const refineRange = step;
    for (let dy = bestY - refineRange; dy <= bestY + refineRange; dy++) {
        for (let dx = bestX - refineRange; dx <= bestX + refineRange; dx++) {
             let diff = 0;
            let count = 0;

            const startX = Math.max(0, dx);
            const endX = Math.min(w, w + dx);
            const startY = Math.max(0, dy);
            const endY = Math.min(h, h + dy);

            if (startX >= endX || startY >= endY) continue;

            for (let y = startY; y < endY; y += 2) { // More detailed sampling
                for (let x = startX; x < endX; x += 2) {
                    const rVal = refGray[y*w + x];
                    const tVal = targetGray[(y-dy)*w + (x-dx)];
                    diff += Math.abs(rVal - tVal);
                    count++;
                }
            }
             if (count > 0) {
                const avgDiff = diff / count;
                if (avgDiff < minDiff) {
                    minDiff = avgDiff;
                    bestX = dx;
                    bestY = dy;
                }
            }
        }
    }

    self.postMessage({ x: bestX, y: bestY });
};
