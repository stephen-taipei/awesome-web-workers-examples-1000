self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Output buffer
    const resultBuffer = new Uint8ClampedArray(data.length);

    const { type, intensity, direction } = params;

    // Precompute offsets
    // Radial: Offset depends on distance from center.
    // Linear: Constant offset.

    const centerX = width / 2;
    const centerY = height / 2;

    const rad = (direction * Math.PI) / 180;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);

    // We can shift R, G, B separately.
    // Common CA: Red shifts one way, Blue shifts opposite, Green stays or shifts slightly.
    // Let's say:
    // R offset = +intensity
    // B offset = -intensity
    // G offset = 0

    // Helper to sample pixel (nearest neighbor with clamp)
    // For better quality, use bilinear. Nearest is faster.
    function getPixel(x, y, channel) {
        // Clamp coords
        x = Math.max(0, Math.min(width - 1, Math.round(x)));
        y = Math.max(0, Math.min(height - 1, Math.round(y)));

        const idx = (y * width + x) * 4;
        return data[idx + channel];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let rX = x, rY = y;
            let bX = x, bY = y;
            // G channel usually stays put or is average

            if (type === 'radial') {
                // Direction is vector from center
                const dx = x - centerX;
                const dy = y - centerY;

                // Normalized distance (0 at center, 1 at edge roughly)
                // Max radius is approx width/2
                // distFactor scales intensity based on distance from center
                const distFactor = Math.sqrt(dx*dx + dy*dy) / (width/2);

                // Shift R outwards, B inwards (or vice versa)
                // If intensity > 0: R out, B in.

                const shift = intensity * distFactor * distFactor; // Quadratic falloff looks better? or Linear

                // Vector normalization (dx, dy) / len
                // But we already have distFactor * (width/2) = len
                // So unit vector is (dx, dy) / len
                // Shift vector = unit * shift

                // Optimization: shiftX = dx * (shift / len)
                // shift / len = (intensity * dist / radius) / dist = intensity / radius
                // Constant scaling factor!

                // wait, if shift is linear with distance: shift = k * dist.
                // then shiftX = (dx/dist) * (k*dist) = k * dx.
                // This is just a scaling transformation!
                // Real CA often increases non-linearly at edges.
                // Let's use dist squared.
                // shift = k * dist^2.
                // shiftX = (dx/dist) * k * dist^2 = k * dx * dist.

                const k = (intensity * 0.002); // scaling factor adjustment

                // Rotate distortion axis? No, radial is symmetric.
                // But "direction" param could rotate the RGB split axis for "Transverse CA"?
                // Radial usually means R moves away from center.

                rX = x - dx * k * distFactor; // Minus to sample from 'inwards' to move pixel 'outwards'
                rY = y - dy * k * distFactor;

                bX = x + dx * k * distFactor;
                bY = y + dy * k * distFactor;

            } else { // Linear
                // Shift along 'direction' angle
                rX = x - dirX * intensity;
                rY = y - dirY * intensity;

                bX = x + dirX * intensity;
                bY = y + dirY * intensity;
            }

            const idx = (y * width + x) * 4;

            resultBuffer[idx] = getPixel(rX, rY, 0);   // R
            resultBuffer[idx+1] = data[idx+1];         // G (original)
            resultBuffer[idx+2] = getPixel(bX, bY, 2); // B
            resultBuffer[idx+3] = data[idx+3];         // A
        }
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        imageData: new ImageData(resultBuffer, width, height),
        time: endTime - startTime
    });
};
