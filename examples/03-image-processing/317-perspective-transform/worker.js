// Perspective Transform - Worker Thread

self.onmessage = function(e) {
    if (e.data.type === 'transform') {
        const { imageData, corners, targetWidth, targetHeight } = e.data;
        const result = applyPerspectiveTransform(imageData, corners, targetWidth, targetHeight);
        self.postMessage({
            type: 'result',
            ...result
        });
    }
};

function applyPerspectiveTransform(srcImageData, corners, width, height) {
    const startTime = performance.now();

    const srcData = new Uint8ClampedArray(srcImageData.data);
    const srcW = srcImageData.width;
    const srcH = srcImageData.height;

    const destData = new Uint8ClampedArray(width * height * 4);

    // Compute Homography Matrix mapping Source -> Destination
    // However, for inverse mapping (iterating over dest pixels), we need Matrix: Dest -> Source.

    // Destination corners (Result image)
    const dstCorners = [
        { x: 0, y: 0 },         // tl
        { x: width, y: 0 },     // tr
        { x: width, y: height }, // br
        { x: 0, y: height }     // bl
    ];

    // Source corners (Selected on original image)
    const srcPts = [
        corners.tl,
        corners.tr,
        corners.br,
        corners.bl
    ];

    // Calculate Homography Matrix H that maps Dest(u,v) -> Source(x,y)
    // Points order: tl, tr, br, bl
    const H = computeHomography(dstCorners, srcPts);

    // Inverse Mapping
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Apply H to (x, y) to find corresponding (u, v) in source
            // H is 3x3. P_src = H * P_dest
            // x' = h00*x + h01*y + h02
            // y' = h10*x + h11*y + h12
            // w' = h20*x + h21*y + h22
            // u = x'/w', v = y'/w'

            const val = (h20 * x + h21 * y + h22);
            const w_prime = val === 0 ? 0.00001 : val; // avoid div by zero

            const srcX = (h00 * x + h01 * y + h02) / w_prime;
            const srcY = (h10 * x + h11 * y + h12) / w_prime;

            // Bilinear Interpolation
            const destIdx = (y * width + x) * 4;

            if (srcX >= 0 && srcX < srcW - 1 && srcY >= 0 && srcY < srcH - 1) {
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = x0 + 1;
                const y1 = y0 + 1;

                const dx = srcX - x0;
                const dy = srcY - y0;

                const idx00 = (y0 * srcW + x0) * 4;
                const idx10 = (y0 * srcW + x1) * 4;
                const idx01 = (y1 * srcW + x0) * 4;
                const idx11 = (y1 * srcW + x1) * 4;

                for (let c = 0; c < 4; c++) { // R, G, B, A
                    const val00 = srcData[idx00 + c];
                    const val10 = srcData[idx10 + c];
                    const val01 = srcData[idx01 + c];
                    const val11 = srcData[idx11 + c];

                    const valTop = val00 * (1 - dx) + val10 * dx;
                    const valBot = val01 * (1 - dx) + val11 * dx;
                    const val = valTop * (1 - dy) + valBot * dy;

                    destData[destIdx + c] = val;
                }
            } else {
                // Out of bounds - transparent or black
                destData[destIdx + 3] = 0;
            }
        }
    }

    const executionTime = performance.now() - startTime;

    return {
        imageData: destData.buffer,
        width,
        height,
        executionTime
    };

    // Helper vars for H matrix
    var h00, h01, h02, h10, h11, h12, h20, h21, h22;

    function computeHomography(src, dst) {
        // Solving Ah = 0 for h
        // But here we want map Dest -> Src.
        // So src array passed to this function should be 'dstCorners' (inputs to matrix)
        // and dst array should be 'srcPts' (outputs of matrix)

        let P = [];
        for (let i = 0; i < 4; i++) {
            let x = src[i].x;
            let y = src[i].y;
            let u = dst[i].x;
            let v = dst[i].y;

            P.push([-x, -y, -1, 0, 0, 0, x * u, y * u, u]);
            P.push([0, 0, 0, -x, -y, -1, x * v, y * v, v]);
        }

        // Gaussian elimination to solve P * h = 0
        // We can set h22 = 1 and solve for others, or use SVD.
        // Gaussian elimination for 8 variables.
        // 8 equations, 9 unknowns (h22 = 1)

        // Simple Gauss-Jordan
        const matrix = P;
        const n = 8;

        // Convert to row echelon
        for (let i = 0; i < n; i++) {
            // pivot
            let pivot = i;
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
            }

            [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];

            // normalize
            let div = matrix[i][i];
            for (let j = i; j <= n; j++) matrix[i][j] /= div;

            // eliminate
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    let factor = matrix[k][i];
                    for (let j = i; j <= n; j++) matrix[k][j] -= factor * matrix[i][j];
                }
            }
        }

        // Result
        const h = new Array(9);
        for (let i = 0; i < 8; i++) {
            h[i] = matrix[i][8]; // Last column is the constant term if we moved it?
            // Wait, the equation is Ah = 0.
            // Actually, usually we set h33=1 (h8 in 0-indexed flat array), so the last column becomes -h8 * col8.
            // If h22=1, then the last column of A is moved to RHS as -col8.
            // In P matrix above: last column is u, v.
            // The system is A * [h0..h7]^T = - [last_col]
            // My P setup puts u, v in the last column which corresponds to h22.
            // So P[i][8] * 1 is on LHS. Move to RHS: -P[i][8].
            // So after G-J, matrix[i][8] should be the value if we treated it as augmented matrix [A|b] where b = -col8.
        }

        // Let's refine the Gaussian Elimination for A x = b
        // Re-build system
        const A = [];
        const b = [];
        for (let i = 0; i < 8; i++) { // 8 equations
            let row = [];
            for (let j = 0; j < 8; j++) {
                row.push(P[i][j]);
            }
            A.push(row);
            b.push(-P[i][8]); // Move last col to RHS (assuming h22=1)
        }

        const x = solveLinearSystem(A, b);

        h00 = x[0]; h01 = x[1]; h02 = x[2];
        h10 = x[3]; h11 = x[4]; h12 = x[5];
        h20 = x[6]; h21 = x[7]; h22 = 1.0;

        return [h00, h01, h02, h10, h11, h12, h20, h21, h22];
    }

    function solveLinearSystem(A, b) {
        const n = A.length;

        // Augment
        for (let i = 0; i < n; i++) {
            A[i].push(b[i]);
        }

        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
                    maxRow = k;
                }
            }

            [A[i], A[maxRow]] = [A[maxRow], A[i]];

            for (let k = i + 1; k < n; k++) {
                const c = -A[k][i] / A[i][i];
                for (let j = i; j < n + 1; j++) {
                    if (i === j) {
                        A[k][j] = 0;
                    } else {
                        A[k][j] += c * A[i][j];
                    }
                }
            }
        }

        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += A[i][j] * x[j];
            }
            x[i] = (A[i][n] - sum) / A[i][i];
        }

        return x;
    }
}
