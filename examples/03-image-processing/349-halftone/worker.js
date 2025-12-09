self.onmessage = function(e) {
    const { imageData, dotSize, angle, invert } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    // Fill background
    const bgVal = invert ? 255 : 0;
    const fgVal = invert ? 0 : 255;

    for (let i = 0; i < dstData.length; i += 4) {
        dstData[i] = bgVal;
        dstData[i+1] = bgVal;
        dstData[i+2] = bgVal;
        dstData[i+3] = 255;
    }

    // Convert angle to radians
    const rad = angle * (Math.PI / 180);
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);

    // Grid calculation
    // We want to iterate over the rotated grid space

    // Calculate bounding box in grid space
    // 0,0 -> 0,0
    // w,0 -> w*cos + 0*sin, -w*sin + 0*cos
    // ...
    // A simpler approach for grid iteration:
    // Iterate over grid coordinates (u, v) and map back to image coordinates (x, y)

    // Find the max dimension to cover rotation
    const maxDim = Math.sqrt(width*width + height*height);
    const gridStart = -maxDim;
    const gridEnd = maxDim;

    let dotsProcessed = 0;
    const totalDotsEst = ((gridEnd - gridStart) / dotSize) ** 2;

    for (let v = gridStart; v < gridEnd; v += dotSize) {
        for (let u = gridStart; u < gridEnd; u += dotSize) {

            // Center of the dot in image space
            // Rotate back: x = u*cos - v*sin, y = u*sin + v*cos
            const cx = u * cos - v * sin + width / 2;
            const cy = u * sin + v * cos + height / 2;

            // Check if center is within image
            if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

            // Sample intensity at (cx, cy)
            // Or sample average over the cell area. Point sampling is faster.
            const idx = (Math.floor(cy) * width + Math.floor(cx)) * 4;
            const brightness = (srcData[idx] + srcData[idx+1] + srcData[idx+2]) / 3;
            const normalizedBrightness = brightness / 255;

            // Dot radius depends on brightness
            // If invert (Dark on Light), darker pixels (low brightness) -> larger dots
            // radius = maxRadius * (1 - brightness)
            let radiusRatio;
            if (invert) {
                radiusRatio = 1 - normalizedBrightness;
            } else {
                radiusRatio = normalizedBrightness;
            }

            // Max radius is dotSize / 2 * sqrt(2) to cover corners, but usually just dotSize/2 is fine for classic halftone
            const maxRadius = dotSize * 0.7;
            const radius = maxRadius * radiusRatio;

            if (radius < 0.5) continue;

            const radiusSq = radius * radius;

            // Rasterize circle
            const startY = Math.max(0, Math.floor(cy - radius));
            const endY = Math.min(height, Math.ceil(cy + radius));
            const startX = Math.max(0, Math.floor(cx - radius));
            const endX = Math.min(width, Math.ceil(cx + radius));

            for (let py = startY; py < endY; py++) {
                for (let px = startX; px < endX; px++) {
                    const distSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
                    if (distSq <= radiusSq) {
                        const dstIdx = (py * width + px) * 4;
                        dstData[dstIdx] = fgVal;
                        dstData[dstIdx + 1] = fgVal;
                        dstData[dstIdx + 2] = fgVal;
                        dstData[dstIdx + 3] = 255;
                    }
                }
            }

            dotsProcessed++;
            if (dotsProcessed % 500 === 0) {
                 // Rough progress estimate
                 const progress = ((v - gridStart) / (gridEnd - gridStart)) * 100;
                 self.postMessage({ type: 'progress', progress: Math.min(99, progress) });
            }
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        imageData: resultImageData,
        time: endTime - startTime
    });
};
