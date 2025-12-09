self.onmessage = function(e) {
    const { imageData, pointSize, density, randomness } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    // Fill with white background
    for (let i = 0; i < dstData.length; i += 4) {
        dstData[i] = 255;     // R
        dstData[i+1] = 255;   // G
        dstData[i+2] = 255;   // B
        dstData[i+3] = 255;   // A
    }

    const step = Math.max(1, Math.floor(pointSize / density));
    const totalPoints = Math.ceil(width / step) * Math.ceil(height / step);
    let pointsProcessed = 0;

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {

            // Random displacement
            let dx = (Math.random() - 0.5) * pointSize * randomness * 2;
            let dy = (Math.random() - 0.5) * pointSize * randomness * 2;

            let cx = Math.floor(x + dx);
            let cy = Math.floor(y + dy);

            // Clamp coordinates
            cx = Math.max(0, Math.min(width - 1, cx));
            cy = Math.max(0, Math.min(height - 1, cy));

            const srcIdx = (cy * width + cx) * 4;
            const r = srcData[srcIdx];
            const g = srcData[srcIdx + 1];
            const b = srcData[srcIdx + 2];

            // Vary point size slightly
            const currentPointSize = pointSize * (1 + (Math.random() - 0.5) * randomness);
            const radius = currentPointSize / 2;
            const radiusSq = radius * radius;

            // Draw circle
            const startY = Math.max(0, Math.floor(cy - radius));
            const endY = Math.min(height, Math.ceil(cy + radius));
            const startX = Math.max(0, Math.floor(cx - radius));
            const endX = Math.min(width, Math.ceil(cx + radius));

            for (let py = startY; py < endY; py++) {
                for (let px = startX; px < endX; px++) {
                    const distSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
                    if (distSq <= radiusSq) {
                        const dstIdx = (py * width + px) * 4;
                        dstData[dstIdx] = r;
                        dstData[dstIdx + 1] = g;
                        dstData[dstIdx + 2] = b;
                        dstData[dstIdx + 3] = 255;
                    }
                }
            }

            pointsProcessed++;
            if (pointsProcessed % 1000 === 0) {
                 const progress = (y / height) * 100;
                 self.postMessage({ type: 'progress', progress: progress });
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
