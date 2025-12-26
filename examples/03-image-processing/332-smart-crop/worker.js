self.onmessage = function(e) {
    const { imageData, targetRatio } = e.data;
    const { width, height, data } = imageData;

    // 1. Calculate saliency map (energy)
    // We use a simplified approach: Gradient Magnitude + Center Bias
    const energy = new Float32Array(width * height);

    // Sobel kernels
    // Gx = [-1 0 1; -2 0 2; -1 0 1]
    // Gy = [-1 -2 -1; 0 0 0; 1 2 1]

    // Helper to get luminance
    function getLuma(idx) {
        return 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
    }

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            // Luminance of neighbors
            // TL T TR
            // L  C  R
            // BL B BR
            const tl = getLuma(((y-1)*width + (x-1))*4);
            const t  = getLuma(((y-1)*width + x)*4);
            const tr = getLuma(((y-1)*width + (x+1))*4);
            const l  = getLuma((y*width + (x-1))*4);
            const r  = getLuma((y*width + (x+1))*4);
            const bl = getLuma(((y+1)*width + (x-1))*4);
            const b  = getLuma(((y+1)*width + x)*4);
            const br = getLuma(((y+1)*width + (x+1))*4);

            const gx = (tr + 2*r + br) - (tl + 2*l + bl);
            const gy = (bl + 2*b + br) - (tl + 2*t + tr);

            const gradient = Math.sqrt(gx*gx + gy*gy);

            // Center bias: weight pixels near center higher
            // Normalized distance from center (0 to 1)
            const cx = (x - width/2) / (width/2);
            const cy = (y - height/2) / (height/2);
            const dist = Math.sqrt(cx*cx + cy*cy);
            const centerWeight = 1 - dist * 0.5; // Slightly favor center

            energy[y * width + x] = gradient * Math.max(0, centerWeight);
        }
    }

    // 2. Find best crop rectangle
    // Determine crop dimensions
    let cropWidth, cropHeight;
    const imageRatio = width / height;

    if (imageRatio > targetRatio) {
        // Image is wider than target. Constrain height.
        cropHeight = height;
        cropWidth = Math.floor(height * targetRatio);
    } else {
        // Image is taller than target. Constrain width.
        cropWidth = width;
        cropHeight = Math.floor(width / targetRatio);
    }

    // We scan possible positions
    // If we are cropping width (image is wide), we slide horizontally.
    // If we are cropping height (image is tall), we slide vertically.
    // To be efficient, we can use integral image (summed area table) but for simple sliding window
    // in 1D (since one dim is fixed to full image size usually), it is just a 1D sum.

    let bestX = 0;
    let bestY = 0;
    let maxScore = -1;

    // Integral image for 2D sum calculation
    // sat[y][x] = sum of energy from (0,0) to (x,y)
    const sat = new Float32Array(width * height);

    // Build SAT
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            rowSum += energy[y*width + x];
            if (y === 0) {
                sat[x] = rowSum;
            } else {
                sat[y*width + x] = sat[(y-1)*width + x] + rowSum;
            }
        }
    }

    function getRectSum(x, y, w, h) {
        const x2 = x + w - 1;
        const y2 = y + h - 1;

        const A = (x > 0 && y > 0) ? sat[(y-1)*width + (x-1)] : 0;
        const B = (y > 0) ? sat[(y-1)*width + x2] : 0;
        const C = (x > 0) ? sat[y2*width + (x-1)] : 0;
        const D = sat[y2*width + x2];

        return D - B - C + A;
    }

    // Sliding window search
    // We can step by e.g. 10 pixels to be faster, then refine.
    // But since one dimension is likely constrained to max, the search space is small.
    // E.g. if we crop width, we only vary X. Y is fixed at 0 and H is fixed at height.

    const step = 4; // Step size for search

    const xRange = width - cropWidth;
    const yRange = height - cropHeight;

    for (let y = 0; y <= yRange; y += step) {
        for (let x = 0; x <= xRange; x += step) {
            const score = getRectSum(x, y, cropWidth, cropHeight);
            if (score > maxScore) {
                maxScore = score;
                bestX = x;
                bestY = y;
            }
        }
    }

    self.postMessage({
        x: bestX,
        y: bestY,
        width: cropWidth,
        height: cropHeight
    });
};
