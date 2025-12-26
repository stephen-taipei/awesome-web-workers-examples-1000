self.onmessage = function(e) {
    const { imageData, segments, offsetAngle, zoom } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // Create new blank imageData
    const resultImageData = new ImageData(width, height);
    const dstData = resultImageData.data;

    const centerX = width / 2;
    const centerY = height / 2;
    const segmentAngle = (2 * Math.PI) / segments;
    const offsetRad = offsetAngle * (Math.PI / 180);

    // Map each pixel of destination to a pixel in source
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            // Vector from center
            let dx = x - centerX;
            let dy = y - centerY;

            // Polar coordinates
            let distance = Math.sqrt(dx * dx + dy * dy);
            let angle = Math.atan2(dy, dx);

            // Adjust angle to be positive
            if (angle < 0) angle += 2 * Math.PI;

            // Map angle to first segment
            // We want to reflect every other segment to make it seamless
            // Determine which segment we are in

            // Normalize angle relative to offset
            let effectiveAngle = (angle - offsetRad) % (2 * Math.PI);
            if (effectiveAngle < 0) effectiveAngle += 2 * Math.PI;

            const segmentIndex = Math.floor(effectiveAngle / segmentAngle);
            let angleInSegment = effectiveAngle % segmentAngle;

            // Mirror logic: if segment index is odd, reflect angle
            // Actually, kaleidoscope usually reflects back and forth
            if (segmentIndex % 2 === 1) {
                angleInSegment = segmentAngle - angleInSegment;
            }

            // Map back to source coordinates (we sample from the first segment area generally, or just rotation)
            // But usually kaleidoscope samples from the whole image but rotated?
            // A common kaleidoscope effect maps the wedge to the image.
            // Let's map angleInSegment back to global angle, plus offset

            const srcAngle = angleInSegment + offsetRad;

            // Calculate source position
            // Zoom affects distance sampling
            // If zoom > 1, we sample closer to center, so we divide distance by zoom
            const srcDist = distance / zoom;

            const sx = centerX + srcDist * Math.cos(srcAngle);
            const sy = centerY + srcDist * Math.sin(srcAngle);

            // Bilinear interpolation or Nearest Neighbor
            // Nearest Neighbor for speed
            const ix = Math.floor(sx);
            const iy = Math.floor(sy);

            let r = 0, g = 0, b = 0, a = 0;

            if (ix >= 0 && ix < width && iy >= 0 && iy < height) {
                const srcIdx = (iy * width + ix) * 4;
                r = srcData[srcIdx];
                g = srcData[srcIdx + 1];
                b = srcData[srcIdx + 2];
                a = srcData[srcIdx + 3];
            }

            const dstIdx = (y * width + x) * 4;
            dstData[dstIdx] = r;
            dstData[dstIdx + 1] = g;
            dstData[dstIdx + 2] = b;
            dstData[dstIdx + 3] = a;
        }

        if (y % 100 === 0) {
            self.postMessage({ type: 'progress', progress: (y / height) * 100 });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        imageData: resultImageData,
        time: endTime - startTime
    });
};
