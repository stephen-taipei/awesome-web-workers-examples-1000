// worker.js

self.onmessage = function(e) {
    const { imageData, options } = e.data;
    const { tileGridSizeX, tileGridSizeY, clipLimit } = options;

    try {
        const startTime = performance.now();
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // Convert RGB to Lab (L channel only needed ideally, but we need to convert back)
        // Or HSL. Let's use HSL L channel for simplicity and performance in JS.
        // Better quality: RGB -> Lab -> CLAHE on L -> RGB.
        // Let's implement RGB -> Lab -> RGB

        // RGB to XYZ to Lab constants

        const pixels = width * height;
        const L_channel = new Float32Array(pixels);
        const A_channel = new Float32Array(pixels);
        const B_channel = new Float32Array(pixels);

        self.postMessage({ type: 'progress', data: 10 });

        // RGB -> Lab
        for (let i = 0; i < pixels; i++) {
            let r = data[i*4] / 255;
            let g = data[i*4+1] / 255;
            let b = data[i*4+2] / 255;

            r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
            g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
            b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

            let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
            let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
            let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

            x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
            y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
            z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

            L_channel[i] = (116 * y) - 16;
            A_channel[i] = 500 * (x - y);
            B_channel[i] = 200 * (y - z);
        }

        self.postMessage({ type: 'progress', data: 30 });

        // CLAHE on L_channel
        // Scale L to 0-255 for histogram calculation
        // L in Lab is 0-100.
        const L_scaled = new Uint8Array(pixels);
        for(let i=0; i<pixels; i++) {
            L_scaled[i] = Math.max(0, Math.min(255, Math.round(L_channel[i] * 2.55)));
        }

        const tileWidth = Math.ceil(width / tileGridSizeX);
        const tileHeight = Math.ceil(height / tileGridSizeY);

        // Calculate histograms and CDFs for each tile
        // CDFs will be stored in a 3D array: [tileY][tileX][intensity]
        const cdfs = new Array(tileGridSizeY);

        for (let ty = 0; ty < tileGridSizeY; ty++) {
            cdfs[ty] = new Array(tileGridSizeX);
            for (let tx = 0; tx < tileGridSizeX; tx++) {

                // Define tile bounds
                const x0 = tx * tileWidth;
                const y0 = ty * tileHeight;
                const x1 = Math.min(x0 + tileWidth, width);
                const y1 = Math.min(y0 + tileHeight, height);
                const tileSize = (x1 - x0) * (y1 - y0);

                // Compute Histogram
                const hist = new Uint32Array(256);
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        hist[L_scaled[y * width + x]]++;
                    }
                }

                // Clip Histogram
                const actualClipLimit = Math.max(1, clipLimit * tileSize / 256);
                let clipped = 0;
                for (let i = 0; i < 256; i++) {
                    if (hist[i] > actualClipLimit) {
                        clipped += hist[i] - actualClipLimit;
                        hist[i] = actualClipLimit;
                    }
                }

                // Redistribute clipped pixels
                const redistBatch = Math.floor(clipped / 256);
                const redistRemainder = clipped % 256;

                for (let i = 0; i < 256; i++) {
                    hist[i] += redistBatch;
                }
                for (let i = 0; i < redistRemainder; i++) {
                    hist[Math.floor(256/redistRemainder * i)]++; // Distribute evenly
                }

                // Compute CDF
                const cdf = new Float32Array(256);
                let sum = 0;
                for (let i = 0; i < 256; i++) {
                    sum += hist[i];
                    cdf[i] = sum / tileSize; // Normalize to 0-1
                }
                cdfs[ty][tx] = cdf;
            }
        }

        self.postMessage({ type: 'progress', data: 60 });

        // Interpolation
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const intensity = L_scaled[y * width + x];

                // Find surrounding tiles
                // We treat tile centers as grid points
                // tile center x = tx * tileWidth + tileWidth/2

                const ty = (y / tileHeight) - 0.5;
                const tx = (x / tileWidth) - 0.5;

                const ty1 = Math.floor(ty);
                const tx1 = Math.floor(tx);
                const ty2 = ty1 + 1;
                const tx2 = tx1 + 1;

                // Weights
                const wy2 = ty - ty1;
                const wy1 = 1.0 - wy2;
                const wx2 = tx - tx1;
                const wx1 = 1.0 - wx2;

                let val = 0;

                // Bilinear interpolation
                // Check boundaries
                const validTy1 = ty1 >= 0 && ty1 < tileGridSizeY;
                const validTy2 = ty2 >= 0 && ty2 < tileGridSizeY;
                const validTx1 = tx1 >= 0 && tx1 < tileGridSizeX;
                const validTx2 = tx2 >= 0 && tx2 < tileGridSizeX;

                if (validTy1 && validTx1) val += cdfs[ty1][tx1][intensity] * wy1 * wx1;
                else if (validTy1 && !validTx1) val += cdfs[ty1][Math.max(0, Math.min(tileGridSizeX-1, tx1))][intensity] * wy1 * wx1; // Boundary handling simplified
                else if (!validTy1 && validTx1) val += cdfs[Math.max(0, Math.min(tileGridSizeY-1, ty1))][tx1][intensity] * wy1 * wx1;

                if (validTy1 && validTx2) val += cdfs[ty1][tx2][intensity] * wy1 * wx2;
                if (validTy2 && validTx1) val += cdfs[ty2][tx1][intensity] * wy2 * wx1;
                if (validTy2 && validTx2) val += cdfs[ty2][tx2][intensity] * wy2 * wx2;

                // Correct for edges where some weights might not be added if logic above is incomplete (simplified for speed)
                // A more robust way is to clamp indices.
                // Let's rewrite cleaner:

                const r1 = Math.max(0, Math.min(tileGridSizeY - 1, ty1));
                const r2 = Math.max(0, Math.min(tileGridSizeY - 1, ty2));
                const c1 = Math.max(0, Math.min(tileGridSizeX - 1, tx1));
                const c2 = Math.max(0, Math.min(tileGridSizeX - 1, tx2));

                const cdf11 = cdfs[r1][c1][intensity];
                const cdf12 = cdfs[r1][c2][intensity];
                const cdf21 = cdfs[r2][c1][intensity];
                const cdf22 = cdfs[r2][c2][intensity];

                val = (cdf11 * wx1 * wy1) + (cdf12 * wx2 * wy1) +
                      (cdf21 * wx1 * wy2) + (cdf22 * wx2 * wy2);

                L_channel[y * width + x] = val * 100; // Scale back to 0-100
            }
        }

        self.postMessage({ type: 'progress', data: 80 });

        // Lab -> RGB
        for (let i = 0; i < pixels; i++) {
            let y = (L_channel[i] + 16) / 116;
            let x = A_channel[i] / 500 + y;
            let z = y - B_channel[i] / 200;

            let x3 = x * x * x;
            let y3 = y * y * y;
            let z3 = z * z * z;

            x = ((x3 > 0.008856) ? x3 : (x - 16/116) / 7.787) * 0.95047;
            y = ((y3 > 0.008856) ? y3 : (y - 16/116) / 7.787) * 1.00000;
            z = ((z3 > 0.008856) ? z3 : (z - 16/116) / 7.787) * 1.08883;

            let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
            let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
            let b = x * 0.0557 + y * -0.2040 + z * 1.0570;

            r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
            g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
            b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1/2.4) - 0.055) : 12.92 * b;

            data[i*4] = Math.max(0, Math.min(255, Math.round(r * 255)));
            data[i*4+1] = Math.max(0, Math.min(255, Math.round(g * 255)));
            data[i*4+2] = Math.max(0, Math.min(255, Math.round(b * 255)));
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: imageData,
                time: endTime - startTime
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
