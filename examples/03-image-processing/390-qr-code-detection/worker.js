self.onmessage = function(e) {
    const { imageData } = e.data;
    const startTime = performance.now();

    try {
        const { width, height, data } = imageData;

        // 1. Binarize (Simple adaptive threshold or global threshold)
        // For simplicity, let's use a global threshold on luminance
        const bin = new Uint8Array(width * height);
        let sum = 0;
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            // Luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            sum += lum;
        }
        const avg = sum / (width * height);
        const threshold = avg; // Simple average threshold

        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            bin[i] = lum < threshold ? 0 : 255; // Black is 0, White is 255
        }

        // 2. Scan for 1:1:3:1:1 pattern
        // We look for sequence Black-White-Black-White-Black with ratios approx 1:1:3:1:1

        const patterns = [];

        // Horizontal Scan
        for (let y = 0; y < height; y += 2) { // Skip every other row for speed
            let stateCount = [0, 0, 0, 0, 0];
            let currentState = 0;
            let ptr = y * width;

            for (let x = 0; x < width; x++) {
                const isBlack = bin[ptr + x] === 0;

                if (isBlack) {
                    // If looking for Black
                    if ((currentState & 1) === 0) { // 0, 2, 4 are black states
                        stateCount[currentState]++;
                    } else { // Was white, now black -> transition
                        currentState++;
                        stateCount[currentState]++;
                    }
                } else { // White
                    // If looking for White
                    if ((currentState & 1) === 1) { // 1, 3 are white states
                        stateCount[currentState]++;
                    } else { // Was black, now white
                         if (currentState === 4) {
                             // Found B-W-B-W-B sequence, check ratio
                             if (checkRatio(stateCount)) {
                                 // Confirmed horizontal, verify vertical
                                 const centerX = x - (stateCount[4] + stateCount[3] + stateCount[2] + stateCount[1] + stateCount[0]) / 2;
                                 if (handlePossibleCenter(bin, width, height, Math.floor(centerX), y, stateCount[2])) {
                                     patterns.push({ x: centerX, y: y, moduleSize: stateCount[2] / 3 });
                                 }
                                 // Reset for next
                                 stateCount = [0, 0, 0, 0, 0];
                                 currentState = 0;
                             } else {
                                 // Shift counts: discard index 0, move others down
                                 stateCount[0] = stateCount[2];
                                 stateCount[1] = stateCount[3];
                                 stateCount[2] = stateCount[4];
                                 stateCount[3] = 1;
                                 stateCount[4] = 0;
                                 currentState = 3;
                             }
                         } else {
                             currentState++;
                             stateCount[currentState]++;
                         }
                    }
                }
            }
        }

        // Clean up duplicates (patterns close to each other)
        const uniquePatterns = mergePatterns(patterns);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                patterns: uniquePatterns,
                time: Math.round(endTime - startTime)
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function checkRatio(counts) {
    let total = 0;
    for (let i = 0; i < 5; i++) {
        if (counts[i] === 0) return false;
        total += counts[i];
    }

    if (total < 7) return false;

    // Theoretical module size
    const moduleSize = total / 7;
    const maxVariance = moduleSize / 2;

    // Check 1:1:3:1:1
    // deviations
    const diff1 = Math.abs(moduleSize - counts[0]);
    const diff2 = Math.abs(moduleSize - counts[1]);
    const diff3 = Math.abs(3 * moduleSize - counts[2]);
    const diff4 = Math.abs(moduleSize - counts[3]);
    const diff5 = Math.abs(moduleSize - counts[4]);

    return diff1 < maxVariance && diff2 < maxVariance &&
           diff3 < 3 * maxVariance && diff4 < maxVariance &&
           diff5 < maxVariance;
}

function handlePossibleCenter(bin, width, height, x, y, centerCountH) {
    // Verify vertical pattern at x
    let stateCount = [0, 0, 0, 0, 0];
    let currentState = 2; // Assume we are at center (Black state index 2)

    // Upward
    let i = y;
    while (i >= 0 && bin[i * width + x] === 0) {
        stateCount[2]++;
        i--;
    }
    if (i < 0) return false;
    while (i >= 0 && bin[i * width + x] !== 0) { // White
        stateCount[1]++;
        i--;
    }
    if (i < 0) return false;
    while (i >= 0 && bin[i * width + x] === 0) { // Black
        stateCount[0]++;
        i--;
    }

    // Downward
    i = y + 1;
    while (i < height && bin[i * width + x] === 0) {
        stateCount[2]++;
        i++;
    }
    if (i >= height) return false;
    while (i < height && bin[i * width + x] !== 0) { // White
        stateCount[3]++;
        i++;
    }
    if (i >= height) return false;
    while (i < height && bin[i * width + x] === 0) { // Black
        stateCount[4]++;
        i++;
    }

    if (!checkRatio(stateCount)) return false;

    // Verify Cross check (Optional: check ratio of center module sizes)
    const centerCountV = stateCount[2];
    const totalV = stateCount.reduce((a, b) => a + b, 0);
    const totalH = centerCountH * 7 / 3; // roughly total H size estimated

    // Aspect ratio check?

    return true;
}

function mergePatterns(patterns) {
    if (patterns.length === 0) return [];

    const merged = [];
    const used = new Array(patterns.length).fill(false);

    for (let i = 0; i < patterns.length; i++) {
        if (used[i]) continue;

        let tx = patterns[i].x;
        let ty = patterns[i].y;
        let tms = patterns[i].moduleSize;
        let count = 1;

        for (let j = i + 1; j < patterns.length; j++) {
            if (used[j]) continue;

            const dx = patterns[i].x - patterns[j].x;
            const dy = patterns[i].y - patterns[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // If distance is small (e.g., < 10 pixels or relative to module size)
            if (dist < 15) {
                tx += patterns[j].x;
                ty += patterns[j].y;
                tms += patterns[j].moduleSize;
                count++;
                used[j] = true;
            }
        }

        merged.push({
            x: tx / count,
            y: ty / count,
            moduleSize: tms / count
        });
    }

    return merged;
}
