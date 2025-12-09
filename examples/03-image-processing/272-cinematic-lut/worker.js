// 3D LUT Definitions for various cinematic styles
// Each LUT is a simplified representation - in production, you'd use .cube files
const LUT_PRESETS = {
    'cinematic-warm': {
        // Warm shadows, lifted blacks, orange highlights
        shadows: { r: 1.1, g: 0.95, b: 0.85 },
        midtones: { r: 1.05, g: 1.0, b: 0.9 },
        highlights: { r: 1.0, g: 0.95, b: 0.85 },
        blackPoint: 15,
        contrast: 1.1,
        saturation: 0.9
    },
    'cinematic-cool': {
        // Cool tones, blue shadows, desaturated
        shadows: { r: 0.85, g: 0.9, b: 1.15 },
        midtones: { r: 0.95, g: 1.0, b: 1.05 },
        highlights: { r: 0.95, g: 0.98, b: 1.02 },
        blackPoint: 10,
        contrast: 1.15,
        saturation: 0.85
    },
    'teal-orange': {
        // Classic blockbuster look
        shadows: { r: 0.7, g: 0.9, b: 1.2 },
        midtones: { r: 1.0, g: 0.95, b: 0.9 },
        highlights: { r: 1.15, g: 1.0, b: 0.85 },
        blackPoint: 8,
        contrast: 1.2,
        saturation: 1.1
    },
    'vintage-film': {
        // Faded film look with warm tones
        shadows: { r: 1.1, g: 1.0, b: 0.9 },
        midtones: { r: 1.0, g: 0.98, b: 0.92 },
        highlights: { r: 1.0, g: 0.95, b: 0.88 },
        blackPoint: 25,
        contrast: 0.9,
        saturation: 0.75
    },
    'noir': {
        // High contrast black and white with slight blue tint
        shadows: { r: 0.9, g: 0.9, b: 1.0 },
        midtones: { r: 1.0, g: 1.0, b: 1.0 },
        highlights: { r: 0.98, g: 0.98, b: 1.0 },
        blackPoint: 5,
        contrast: 1.4,
        saturation: 0.15
    },
    'blockbuster': {
        // High saturation, punchy colors
        shadows: { r: 0.85, g: 0.85, b: 1.1 },
        midtones: { r: 1.0, g: 1.0, b: 1.0 },
        highlights: { r: 1.1, g: 1.05, b: 0.95 },
        blackPoint: 5,
        contrast: 1.25,
        saturation: 1.2
    }
};

// Generate a 3D LUT cube from preset
function generateLUT(preset, size = 32) {
    const lut = new Float32Array(size * size * size * 3);
    const step = 1 / (size - 1);

    for (let b = 0; b < size; b++) {
        for (let g = 0; g < size; g++) {
            for (let r = 0; r < size; r++) {
                const idx = (b * size * size + g * size + r) * 3;

                // Normalized input colors
                let inR = r * step;
                let inG = g * step;
                let inB = b * step;

                // Calculate luminance for zone detection
                const lum = 0.299 * inR + 0.587 * inG + 0.114 * inB;

                // Shadow/Midtone/Highlight zones with smooth transitions
                const shadowWeight = smoothstep(0, 0.3, 1 - lum);
                const highlightWeight = smoothstep(0.7, 1.0, lum);
                const midtoneWeight = 1 - shadowWeight - highlightWeight;

                // Apply zone-based color grading
                let outR = inR * (
                    preset.shadows.r * shadowWeight +
                    preset.midtones.r * midtoneWeight +
                    preset.highlights.r * highlightWeight
                );
                let outG = inG * (
                    preset.shadows.g * shadowWeight +
                    preset.midtones.g * midtoneWeight +
                    preset.highlights.g * highlightWeight
                );
                let outB = inB * (
                    preset.shadows.b * shadowWeight +
                    preset.midtones.b * midtoneWeight +
                    preset.highlights.b * highlightWeight
                );

                // Apply contrast (S-curve)
                outR = applySCurve(outR, preset.contrast);
                outG = applySCurve(outG, preset.contrast);
                outB = applySCurve(outB, preset.contrast);

                // Lift blacks
                const blackLift = preset.blackPoint / 255;
                outR = blackLift + outR * (1 - blackLift);
                outG = blackLift + outG * (1 - blackLift);
                outB = blackLift + outB * (1 - blackLift);

                // Apply saturation
                const gray = 0.299 * outR + 0.587 * outG + 0.114 * outB;
                outR = gray + (outR - gray) * preset.saturation;
                outG = gray + (outG - gray) * preset.saturation;
                outB = gray + (outB - gray) * preset.saturation;

                lut[idx] = clamp(outR, 0, 1);
                lut[idx + 1] = clamp(outG, 0, 1);
                lut[idx + 2] = clamp(outB, 0, 1);
            }
        }
    }

    return lut;
}

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

function applySCurve(x, strength) {
    // S-curve for contrast adjustment
    const midpoint = 0.5;
    if (x < midpoint) {
        return midpoint * Math.pow(2 * x, strength) / 2;
    } else {
        return 1 - midpoint * Math.pow(2 * (1 - x), strength) / 2;
    }
}

function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}

// Trilinear interpolation for LUT lookup
function applyLUT(r, g, b, lut, size) {
    // Scale to LUT coordinates
    const scale = size - 1;
    const rIdx = r * scale;
    const gIdx = g * scale;
    const bIdx = b * scale;

    // Get integer and fractional parts
    const r0 = Math.floor(rIdx);
    const g0 = Math.floor(gIdx);
    const b0 = Math.floor(bIdx);
    const r1 = Math.min(r0 + 1, size - 1);
    const g1 = Math.min(g0 + 1, size - 1);
    const b1 = Math.min(b0 + 1, size - 1);

    const rFrac = rIdx - r0;
    const gFrac = gIdx - g0;
    const bFrac = bIdx - b0;

    // 8 corner samples for trilinear interpolation
    const getColor = (ri, gi, bi) => {
        const idx = (bi * size * size + gi * size + ri) * 3;
        return [lut[idx], lut[idx + 1], lut[idx + 2]];
    };

    const c000 = getColor(r0, g0, b0);
    const c100 = getColor(r1, g0, b0);
    const c010 = getColor(r0, g1, b0);
    const c110 = getColor(r1, g1, b0);
    const c001 = getColor(r0, g0, b1);
    const c101 = getColor(r1, g0, b1);
    const c011 = getColor(r0, g1, b1);
    const c111 = getColor(r1, g1, b1);

    // Trilinear interpolation
    const lerp = (a, b, t) => a + (b - a) * t;

    const result = [];
    for (let i = 0; i < 3; i++) {
        const c00 = lerp(c000[i], c100[i], rFrac);
        const c01 = lerp(c001[i], c101[i], rFrac);
        const c10 = lerp(c010[i], c110[i], rFrac);
        const c11 = lerp(c011[i], c111[i], rFrac);

        const c0 = lerp(c00, c10, gFrac);
        const c1 = lerp(c01, c11, gFrac);

        result[i] = lerp(c0, c1, bFrac);
    }

    return result;
}

self.onmessage = function(e) {
    const { command, imageData, width, height, lutStyle, intensity } = e.data;

    if (command === 'apply') {
        const start = performance.now();

        self.postMessage({ type: 'status', data: 'Generating LUT...' });

        const preset = LUT_PRESETS[lutStyle];
        const lutSize = 32;
        const lut = generateLUT(preset, lutSize);

        self.postMessage({ type: 'status', data: 'Applying color grading...' });

        const pixels = new Uint8ClampedArray(imageData);
        const totalPixels = width * height;

        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;

            // Normalize to 0-1 range
            const r = pixels[idx] / 255;
            const g = pixels[idx + 1] / 255;
            const b = pixels[idx + 2] / 255;

            // Apply LUT with trilinear interpolation
            const [newR, newG, newB] = applyLUT(r, g, b, lut, lutSize);

            // Blend with original based on intensity
            pixels[idx] = Math.round((r * (1 - intensity) + newR * intensity) * 255);
            pixels[idx + 1] = Math.round((g * (1 - intensity) + newG * intensity) * 255);
            pixels[idx + 2] = Math.round((b * (1 - intensity) + newB * intensity) * 255);
            // Alpha unchanged

            // Progress update every 10%
            if (i % Math.floor(totalPixels / 10) === 0) {
                const progress = Math.round((i / totalPixels) * 100);
                self.postMessage({ type: 'status', data: `Processing: ${progress}%` });
            }
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: pixels.buffer,
                width,
                height,
                duration: (end - start).toFixed(2)
            }
        }, [pixels.buffer]);
    }
};
