// Instagram Filter - Web Worker

self.onmessage = function(e) {
    const { imageData, width, height, intensity, vignetteStrength, filter } = e.data;

    const pixels = new Uint8ClampedArray(imageData);
    const totalPixels = width * height;

    // Calculate center for vignette
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    let lastProgress = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        let r = pixels[idx];
        let g = pixels[idx + 1];
        let b = pixels[idx + 2];
        // Alpha remains unchanged

        // 1. Apply contrast
        r = applyContrast(r, filter.contrast, intensity);
        g = applyContrast(g, filter.contrast, intensity);
        b = applyContrast(b, filter.contrast, intensity);

        // 2. Apply brightness
        r = applyBrightness(r, filter.brightness, intensity);
        g = applyBrightness(g, filter.brightness, intensity);
        b = applyBrightness(b, filter.brightness, intensity);

        // 3. Apply saturation
        const sat = 1 + (filter.saturation - 1) * intensity;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + sat * (r - gray);
        g = gray + sat * (g - gray);
        b = gray + sat * (b - gray);

        // 4. Apply tint
        r += filter.tint.r * intensity;
        g += filter.tint.g * intensity;
        b += filter.tint.b * intensity;

        // 5. Apply shadow/highlight adjustments based on luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        if (luminance < 0.4) {
            // Shadows
            const shadowFactor = (0.4 - luminance) / 0.4 * intensity;
            r += filter.shadows.r * shadowFactor;
            g += filter.shadows.g * shadowFactor;
            b += filter.shadows.b * shadowFactor;
        } else if (luminance > 0.6) {
            // Highlights
            const highlightFactor = (luminance - 0.6) / 0.4 * intensity;
            r += filter.highlights.r * highlightFactor;
            g += filter.highlights.g * highlightFactor;
            b += filter.highlights.b * highlightFactor;
        }

        // 6. Apply vignette effect
        if (vignetteStrength > 0) {
            const x = i % width;
            const y = Math.floor(i / width);
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const normalizedDist = distance / maxDistance;

            // Smooth vignette falloff
            const vignetteFactor = 1 - Math.pow(normalizedDist * vignetteStrength, 2);
            const factor = Math.max(0, Math.min(1, vignetteFactor));

            r *= factor;
            g *= factor;
            b *= factor;
        }

        // Clamp values
        pixels[idx] = clamp(r);
        pixels[idx + 1] = clamp(g);
        pixels[idx + 2] = clamp(b);

        // Report progress every 2%
        const progress = Math.floor((i / totalPixels) * 100);
        if (progress >= lastProgress + 2) {
            lastProgress = progress;
            self.postMessage({
                type: 'progress',
                percent: progress,
                processedPixels: i,
                totalPixels: totalPixels
            });
        }
    }

    // Send result back
    self.postMessage({
        type: 'result',
        imageData: pixels.buffer
    }, [pixels.buffer]);
};

function applyContrast(value, contrast, intensity) {
    const c = 1 + (contrast - 1) * intensity;
    return ((value - 128) * c) + 128;
}

function applyBrightness(value, brightness, intensity) {
    return value + brightness * intensity;
}

function clamp(value) {
    return Math.min(255, Math.max(0, Math.round(value)));
}
