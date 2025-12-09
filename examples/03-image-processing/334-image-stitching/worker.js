self.onmessage = function(e) {
    const { images } = e.data;

    // Simplified stitcher: Assumes two images (Left, Right) with horizontal overlap.
    // Finds best horizontal offset by minimizing pixel difference in overlap region.

    if (images.length < 2) return;

    const img1 = images[0];
    const img2 = images[1];

    // We assume they are roughly same height
    const h = Math.min(img1.height, img2.height);
    const w1 = img1.width;
    const w2 = img2.width;

    // Parameters for search
    // We search for overlap from 10% width to 50% width
    const minOverlap = Math.floor(w1 * 0.1);
    const maxOverlap = Math.floor(w1 * 0.9);

    let bestOffset = 0;
    let minDiff = Infinity;

    // Helper to get pixel
    function getPixel(imgData, x, y) {
        const idx = (y * imgData.width + x) * 4;
        return [
            imgData.data[idx],
            imgData.data[idx+1],
            imgData.data[idx+2]
        ];
    }

    // Search for best overlap
    // Offset is how much Image 2 is shifted relative to Image 1.
    // If they overlap by K pixels, Offset = w1 - K.
    // Image 2 starts at x = Offset.

    // Optimizing loop: check every Nth pixel or row to speed up
    const step = 4;

    for (let overlap = minOverlap; overlap < maxOverlap; overlap += step) {
        const offset = w1 - overlap;
        let diffSum = 0;
        let count = 0;

        // Check overlap region
        // Img1 region: [offset, w1)
        // Img2 region: [0, overlap)

        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < overlap; x += step) {
                const p1 = getPixel(img1, offset + x, y);
                const p2 = getPixel(img2, x, y);

                const dR = p1[0] - p2[0];
                const dG = p1[1] - p2[1];
                const dB = p1[2] - p2[2];

                diffSum += Math.abs(dR) + Math.abs(dG) + Math.abs(dB);
                count++;
            }
        }

        const avgDiff = diffSum / count;

        if (avgDiff < minDiff) {
            minDiff = avgDiff;
            bestOffset = offset;
        }
    }

    // Final refine search around bestOffset
    // ... skipping refine for this demo, bestOffset is usually good enough with step=4

    // Create stitched image
    const finalW = bestOffset + w2;
    const finalH = Math.max(img1.height, img2.height);

    const result = new Uint8ClampedArray(finalW * finalH * 4);

    // Copy Img1
    for (let y = 0; y < img1.height; y++) {
        const srcStart = y * w1 * 4;
        const srcEnd = srcStart + w1 * 4;
        const destStart = y * finalW * 4;
        result.set(img1.data.subarray(srcStart, srcEnd), destStart);
    }

    // Blend Img2
    // Overlap region: x from bestOffset to w1
    // Non-overlap Img2: x from w1-bestOffset to w2

    // For simple stitch, we can just overwrite or alpha blend.
    // Let's do a linear blend in the overlap region.

    const overlapWidth = w1 - bestOffset;

    for (let y = 0; y < img2.height; y++) {
        for (let x = 0; x < w2; x++) {
            const destX = bestOffset + x;
            const destIdx = (y * finalW + destX) * 4;

            const srcIdx = (y * w2 + x) * 4;
            const r2 = img2.data[srcIdx];
            const g2 = img2.data[srcIdx+1];
            const b2 = img2.data[srcIdx+2];
            const a2 = img2.data[srcIdx+3];

            if (x < overlapWidth) {
                // Blending
                const alpha = x / overlapWidth; // 0 to 1

                // Existing pixel from Img1
                const r1 = result[destIdx];
                const g1 = result[destIdx+1];
                const b1 = result[destIdx+2];

                result[destIdx]   = r1 * (1 - alpha) + r2 * alpha;
                result[destIdx+1] = g1 * (1 - alpha) + g2 * alpha;
                result[destIdx+2] = b1 * (1 - alpha) + b2 * alpha;
                result[destIdx+3] = 255;
            } else {
                // Just copy Img2
                result[destIdx]   = r2;
                result[destIdx+1] = g2;
                result[destIdx+2] = b2;
                result[destIdx+3] = 255;
            }
        }
    }

    const finalImageData = new ImageData(result, finalW, finalH);

    self.postMessage({
        imageData: finalImageData,
        offset: bestOffset
    });
};
