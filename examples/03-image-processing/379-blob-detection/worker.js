// worker.js

self.onmessage = function(e) {
    const { imageData, sigma, threshold } = e.data;

    try {
        const startTime = performance.now();
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // 1. Grayscale
        const gray = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            gray[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255.0;
        }

        self.postMessage({ type: 'progress', data: 10 });

        // 2. Laplacian of Gaussian (LoG)
        // We can approximate LoG by convolving with a LoG kernel.
        // LoG kernel size usually 3*sigma or 6*sigma.
        // Kernel generation:
        // LoG(x,y) = -1/(pi*sigma^4) * (1 - (x^2+y^2)/(2*sigma^2)) * e^(-(x^2+y^2)/(2*sigma^2))

        const kSize = Math.ceil(sigma * 6);
        const kernelSize = kSize % 2 === 0 ? kSize + 1 : kSize;
        const halfSize = Math.floor(kernelSize / 2);
        const kernel = new Float32Array(kernelSize * kernelSize);

        let sum = 0; // LoG sum is 0

        for (let y = -halfSize; y <= halfSize; y++) {
            for (let x = -halfSize; x <= halfSize; x++) {
                const r2 = x*x + y*y;
                const s2 = 2 * sigma * sigma;
                const val = ((r2 - s2) / (s2 * s2)) * Math.exp(-r2 / s2); // Simplified constant factor
                // Or standard formula:
                // (x^2 + y^2 - 2sigma^2) / (sigma^4) * exp(...)
                // Let's use simplified without constant factors, just shape matters for detection, scale handled later?
                // Actually scale normalization is important for scale invariance, but here fixed scale.

                // Let's use: (r^2 - 2sigma^2) * exp(-r^2 / 2sigma^2)
                const v = (r2 - 2*sigma*sigma) * Math.exp(-r2 / (2*sigma*sigma));
                const idx = (y + halfSize) * kernelSize + (x + halfSize);
                kernel[idx] = v;
                sum += v;
            }
        }

        // Zero mean correction
        const mean = sum / (kernelSize * kernelSize);
        for(let i=0; i<kernel.length; i++) kernel[i] -= mean;

        self.postMessage({ type: 'progress', data: 20 });

        // Convolution
        const response = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let val = 0;

                for (let ky = -halfSize; ky <= halfSize; ky++) {
                    for (let kx = -halfSize; kx <= halfSize; kx++) {
                        const iy = y + ky;
                        const ix = x + kx;

                        if (iy >= 0 && iy < height && ix >= 0 && ix < width) {
                            const kVal = kernel[(ky + halfSize) * kernelSize + (kx + halfSize)];
                            val += gray[iy * width + ix] * kVal;
                        }
                    }
                }

                // Scale normalization: multiply response by sigma^2
                // SIFT does this for scale invariance.
                response[y * width + x] = val * sigma * sigma;
            }

            if (y % 20 === 0) self.postMessage({ type: 'progress', data: 20 + (y/height)*70 });
        }

        // 3. Find Extrema (Blobs)
        // Since we only do one scale, we just look for local maxima/minima in 3x3 neighborhood.
        // Bright blobs on dark background -> Local Minima (due to inverted LoG kernel shape usually)
        // or Local Maxima?
        // With kernel (r^2 - 2s^2), center (r=0) is negative (-2s^2).
        // So a bright spot convolution will differ.
        // Standard LoG has negative center.
        // So bright blob = response minimum (most negative).
        // Dark blob = response maximum (most positive).

        // Let's find local extremas with absolute value > threshold

        const blobs = [];
        const rAbs = new Float32Array(width * height);
        for(let i=0; i<width*height; i++) rAbs[i] = Math.abs(response[i]);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const val = rAbs[idx];

                if (val > threshold) {
                    // Check local max of absolute response
                    let isMax = true;
                    for (let ny = -1; ny <= 1; ny++) {
                        for (let nx = -1; nx <= 1; nx++) {
                            if (ny === 0 && nx === 0) continue;
                            if (rAbs[(y+ny)*width + (x+nx)] > val) {
                                isMax = false;
                                break;
                            }
                        }
                        if (!isMax) break;
                    }

                    if (isMax) {
                        blobs.push({ x, y, sigma: sigma, strength: val });
                    }
                }
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                blobs: blobs,
                time: endTime - startTime,
                width: width,
                height: height
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
