self.onmessage = function(e) {
    const { target, source, offsetX, offsetY } = e.data;

    const w = target.width;
    const h = target.height;
    const sw = source.width;
    const sh = source.height;

    // Bounds for source in target
    const startX = Math.max(0, offsetX);
    const startY = Math.max(0, offsetY);
    const endX = Math.min(w, offsetX + sw);
    const endY = Math.min(h, offsetY + sh);

    // Valid blend region
    const blendW = endX - startX;
    const blendH = endY - startY;

    if (blendW <= 0 || blendH <= 0) {
        self.postMessage({ type: 'done', imageData: target });
        return;
    }

    // Prepare arrays for Solver
    // We solve for RGB channels separately.
    // Unknowns: x[i,j] (pixel values in blending region)
    // Poisson Equation: 4*x[i,j] - x[i-1,j] - x[i+1,j] - x[i,j-1] - x[i,j+1] = div(gradients)

    // To simplify:
    // We use Jacobi iteration.
    // New_Val(x,y) = (Neighbor_Sum + Laplacian_Source(x,y)) / 4

    // Initialize solution with source pixels (or target, doesn't matter much for convergence, source is better guess)
    // Actually, good initialization helps. Source pixels + (Average_Boundary_Diff) is a good start.

    // 1. Calculate Laplacian of Source (The "Texture")
    // Laplacian S(x,y) = 4*S(x,y) - S(x-1,y) - S(x+1,y) - S(y-1) - S(y+1)

    // We need 3 Float32Arrays for R, G, B of the blending region
    const size = blendW * blendH;
    const r = new Float32Array(size);
    const g = new Float32Array(size);
    const b = new Float32Array(size);

    // Laplacian fields
    const lapR = new Float32Array(size);
    const lapG = new Float32Array(size);
    const lapB = new Float32Array(size);

    // Helper to get source pixel (relative to blend region start)
    // Map blend region (bx, by) to source coord (sx, sy)
    // sx = bx + startX - offsetX
    // sy = by + startY - offsetY

    function getSourceIdx(bx, by) {
        const sx = bx + startX - offsetX;
        const sy = by + startY - offsetY;
        if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) return -1;
        return (sy * sw + sx) * 4;
    }

    function getTargetIdx(bx, by) {
        const tx = startX + bx;
        const ty = startY + by;
        return (ty * w + tx) * 4;
    }

    // Copy initial guess and compute Laplacian
    for (let y = 0; y < blendH; y++) {
        for (let x = 0; x < blendW; x++) {
            const idx = y * blendW + x;
            const sIdx = getSourceIdx(x, y);

            // Initial guess: Source pixel
            r[idx] = source.data[sIdx];
            g[idx] = source.data[sIdx+1];
            b[idx] = source.data[sIdx+2];

            // Laplacian of Source
            // Need neighbors in source
            // If neighbor is outside source, we clamp or mirror?
            // For blending, usually we ignore boundary gradients or handle them carefully.
            // Simplified: Use central difference, clamp to edge.

            const vC = [source.data[sIdx], source.data[sIdx+1], source.data[sIdx+2]];

            let vL = vC, vR = vC, vU = vC, vD = vC;

            const sIdxL = getSourceIdx(x-1, y);
            if (sIdxL !== -1) vL = [source.data[sIdxL], source.data[sIdxL+1], source.data[sIdxL+2]];

            const sIdxR = getSourceIdx(x+1, y);
            if (sIdxR !== -1) vR = [source.data[sIdxR], source.data[sIdxR+1], source.data[sIdxR+2]];

            const sIdxU = getSourceIdx(x, y-1);
            if (sIdxU !== -1) vU = [source.data[sIdxU], source.data[sIdxU+1], source.data[sIdxU+2]];

            const sIdxD = getSourceIdx(x, y+1);
            if (sIdxD !== -1) vD = [source.data[sIdxD], source.data[sIdxD+1], source.data[sIdxD+2]];

            lapR[idx] = 4*vC[0] - vL[0] - vR[0] - vU[0] - vD[0];
            lapG[idx] = 4*vC[1] - vL[1] - vR[1] - vU[1] - vD[1];
            lapB[idx] = 4*vC[2] - vL[2] - vR[2] - vU[2] - vD[2];
        }
    }

    // Jacobi Iteration
    // Solve for Ax = b.
    // At each pixel (x,y) in blend region:
    // 4 * NewVal = Sum(Neighbors) + Laplacian
    // Neighbors can be:
    // 1. Inside blend region: Use value from previous iteration
    // 2. Outside blend region (Boundary): Use value from Target Image (Fixed Boundary Condition)

    const iterations = 100; // Enough for demo?

    // Double buffer for updates
    const rNext = new Float32Array(size);
    const gNext = new Float32Array(size);
    const bNext = new Float32Array(size);

    for (let it = 0; it < iterations; it++) {
        let maxChange = 0;

        for (let y = 0; y < blendH; y++) {
            for (let x = 0; x < blendW; x++) {
                const idx = y * blendW + x;

                // Neighbors
                let sumR = 0, sumG = 0, sumB = 0;

                // Left
                if (x > 0) {
                    sumR += r[idx-1]; sumG += g[idx-1]; sumB += b[idx-1];
                } else {
                    // Boundary: Use target pixel
                    const tIdx = getTargetIdx(x-1, y);
                    sumR += target.data[tIdx]; sumG += target.data[tIdx+1]; sumB += target.data[tIdx+2];
                }

                // Right
                if (x < blendW - 1) {
                    sumR += r[idx+1]; sumG += g[idx+1]; sumB += b[idx+1];
                } else {
                    const tIdx = getTargetIdx(x+1, y);
                    sumR += target.data[tIdx]; sumG += target.data[tIdx+1]; sumB += target.data[tIdx+2];
                }

                // Up
                if (y > 0) {
                    sumR += r[idx-blendW]; sumG += g[idx-blendW]; sumB += b[idx-blendW];
                } else {
                    const tIdx = getTargetIdx(x, y-1);
                    sumR += target.data[tIdx]; sumG += target.data[tIdx+1]; sumB += target.data[tIdx+2];
                }

                // Down
                if (y < blendH - 1) {
                    sumR += r[idx+blendW]; sumG += g[idx+blendW]; sumB += b[idx+blendW];
                } else {
                    const tIdx = getTargetIdx(x, y+1);
                    sumR += target.data[tIdx]; sumG += target.data[tIdx+1]; sumB += target.data[tIdx+2];
                }

                // Update rule: val = (NeighborSum + Laplacian) / 4
                rNext[idx] = (sumR + lapR[idx]) / 4;
                gNext[idx] = (sumG + lapG[idx]) / 4;
                bNext[idx] = (sumB + lapB[idx]) / 4;

                // Diff check (on R channel for speed)
                // const diff = Math.abs(rNext[idx] - r[idx]);
                // if (diff > maxChange) maxChange = diff;
            }
        }

        // Swap buffers
        r.set(rNext);
        g.set(gNext);
        b.set(bNext);

        // Report progress
        if (it % 10 === 0) {
            // Write current solution to target data for preview
            writeToTarget();
            self.postMessage({
                type: 'progress',
                iteration: it,
                error: maxChange,
                imageData: target
            });
        }
    }

    function writeToTarget() {
        for (let y = 0; y < blendH; y++) {
            for (let x = 0; x < blendW; x++) {
                const tIdx = getTargetIdx(x, y);
                const sIdx = y * blendW + x;

                target.data[tIdx] = Math.max(0, Math.min(255, r[sIdx]));
                target.data[tIdx+1] = Math.max(0, Math.min(255, g[sIdx]));
                target.data[tIdx+2] = Math.max(0, Math.min(255, b[sIdx]));
                target.data[tIdx+3] = 255; // Force opaque
            }
        }
    }

    writeToTarget();
    self.postMessage({ type: 'done', imageData: target });
};
