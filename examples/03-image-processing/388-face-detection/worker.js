self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const startTime = performance.now();

    try {
        const { width, height, data } = imageData;

        // 1. Grayscale Conversion
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        // 2. Compute Integral Image (SAT)
        // SAT[x, y] = i(x,y) + SAT[x-1, y] + SAT[x, y-1] - SAT[x-1, y-1]
        const integral = new Uint32Array(width * height);
        const integralSq = new Uint32Array(width * height); // For variance normalization if needed

        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            let rowSumSq = 0;
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const val = gray[idx];
                rowSum += val;
                rowSumSq += val * val;

                if (y === 0) {
                    integral[idx] = rowSum;
                    integralSq[idx] = rowSumSq;
                } else {
                    integral[idx] = rowSum + integral[(y - 1) * width + x];
                    integralSq[idx] = rowSumSq + integralSq[(y - 1) * width + x];
                }
            }
        }

        self.postMessage({ type: 'progress', data: { progress: 0.2 } });

        // 3. Face Detection (Simplified Cascade)
        // Since we don't have a trained XML model, we will implement a very basic heuristic detector
        // using Haar-like feature principles manually hardcoded to resemble a "face".
        // A face typically has:
        // - Eye region darker than cheek region
        // - Eye region darker than bridge of nose
        // - Forehead brighter than eye region

        const faces = detectFaces(integral, integralSq, width, height, params);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                faces: faces,
                time: Math.round(endTime - startTime)
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function getSum(integral, width, x, y, w, h) {
    if (x < 0 || y < 0 || x + w >= width || y + h >= integral.length / width) return 0;

    const x2 = x + w - 1;
    const y2 = y + h - 1;

    let a = 0, b = 0, c = 0, d = 0;

    d = integral[y2 * width + x2];

    if (x > 0) c = integral[y2 * width + (x - 1)];
    if (y > 0) b = integral[(y - 1) * width + x2];
    if (x > 0 && y > 0) a = integral[(y - 1) * width + (x - 1)];

    return d - b - c + a;
}

function detectFaces(integral, integralSq, width, height, params) {
    const faces = [];
    const minSize = Math.floor(Math.min(width, height) * params.minScale);
    const maxSize = Math.floor(Math.min(width, height) * params.maxScale);
    const scaleStep = params.scaleStep;

    // Base window size for features (usually 24x24 in Viola-Jones)
    const baseSize = 24;

    let currentScale = minSize / baseSize;

    // Total steps estimation for progress
    let steps = 0;
    for (let s = minSize; s <= maxSize; s *= scaleStep) steps++;
    let currentStep = 0;

    for (let size = minSize; size <= maxSize; size *= scaleStep) {
        currentScale = size / baseSize;
        const step = Math.max(2, Math.floor(scaleStep * 2)); // sliding window step

        for (let y = 0; y < height - size; y += step) {
            for (let x = 0; x < width - size; x += step) {

                // Variance normalization (Standard Deviation Check)
                // Skip low variance regions (flat regions)
                const mean = getSum(integral, width, x, y, size, size) / (size * size);
                // Simplify: Just check brightness to skip dark/bright extremes if wanted,
                // but let's stick to Haar features.

                // Simplified Haar-like Features for "Face"
                // Coordinates relative to window (0..size)

                // 1. Eyes are darker than cheeks (Horizontal 3-rect feature equivalent)
                // Top third is forehead (lighter), middle third contains eyes (darker)
                // Let's approximate:
                // Eye band: y from 0.2*h to 0.45*h
                // Cheek band: y from 0.5*h to 0.8*h

                const h = size;
                const w = size;

                // Feature 1: Eye region (darker) vs Forehead (lighter)
                // Rectangle 1 (Forehead): 0, 0, w, h/3
                // Rectangle 2 (Eyes): 0, h/3, w, h/6
                const foreheadSum = getSum(integral, width, x, y, w, Math.floor(h/3));
                const eyesSum = getSum(integral, width, x, y + Math.floor(h/3), w, Math.floor(h/6));

                const foreheadAvg = foreheadSum / (w * Math.floor(h/3));
                const eyesAvg = eyesSum / (w * Math.floor(h/6));

                if (eyesAvg > foreheadAvg * 0.95) continue; // Eyes should be significantly darker

                // Feature 2: Two eyes (dark) vs Bridge of nose (light)
                // Left Eye: 0.1w, 0.3h, 0.3w, 0.2h
                // Right Eye: 0.6w, 0.3h, 0.3w, 0.2h
                // Bridge: 0.4w, 0.3h, 0.2w, 0.2h

                const leftEyeX = x + Math.floor(0.15 * w);
                const rightEyeX = x + Math.floor(0.55 * w);
                const bridgeX = x + Math.floor(0.4 * w);
                const eyeY = y + Math.floor(0.25 * h);
                const eyeW = Math.floor(0.3 * w);
                const eyeH = Math.floor(0.2 * h);
                const bridgeW = Math.floor(0.2 * w); // narrower bridge

                const leftEyeSum = getSum(integral, width, leftEyeX, eyeY, eyeW, eyeH);
                const rightEyeSum = getSum(integral, width, rightEyeX, eyeY, eyeW, eyeH);
                const bridgeSum = getSum(integral, width, bridgeX, eyeY, bridgeW, eyeH);

                const leftEyeAvg = leftEyeSum / (eyeW * eyeH);
                const rightEyeAvg = rightEyeSum / (eyeW * eyeH);
                const bridgeAvg = bridgeSum / (bridgeW * eyeH);

                if (leftEyeAvg > bridgeAvg * 0.95 || rightEyeAvg > bridgeAvg * 0.95) continue;

                // Feature 3: Nose vertical (Bridge is lighter than sides of nose? Actually nose ridge is light)
                // Let's check Mouth area vs Nose
                // Mouth is usually darker than chin or upper lip skin

                // Simple pass
                faces.push({ x, y, width: size, height: size });
            }
        }

        currentStep++;
        self.postMessage({ type: 'progress', data: { progress: 0.2 + (0.8 * currentStep / steps) } });
    }

    // Non-Maximum Suppression (NMS) to merge overlapping rectangles
    return mergeRects(faces);
}

function mergeRects(rects) {
    if (rects.length === 0) return [];

    const merged = [];
    const used = new Array(rects.length).fill(false);

    for (let i = 0; i < rects.length; i++) {
        if (used[i]) continue;

        let tx = rects[i].x;
        let ty = rects[i].y;
        let tw = rects[i].width;
        let th = rects[i].height;
        let count = 1;

        for (let j = i + 1; j < rects.length; j++) {
            if (used[j]) continue;

            if (isOverlapping(rects[i], rects[j])) {
                tx += rects[j].x;
                ty += rects[j].y;
                tw += rects[j].width;
                th += rects[j].height;
                count++;
                used[j] = true;
            }
        }

        merged.push({
            x: Math.floor(tx / count),
            y: Math.floor(ty / count),
            width: Math.floor(tw / count),
            height: Math.floor(th / count)
        });
    }

    return merged;
}

function isOverlapping(r1, r2) {
    // Check if centers are close enough relative to size
    const center1 = { x: r1.x + r1.width/2, y: r1.y + r1.height/2 };
    const center2 = { x: r2.x + r2.width/2, y: r2.y + r2.height/2 };

    const dist = Math.sqrt(Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2));
    const avgDiag = (Math.sqrt(r1.width**2 + r1.height**2) + Math.sqrt(r2.width**2 + r2.height**2)) / 2;

    return dist < avgDiag * 0.5; // Overlap threshold
}
