self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Result buffer initialized with original image
    const resultBuffer = new Uint8ClampedArray(data);

    // Pass 1: Extract Bright Spots (Light Source Mask)
    // We create a smaller buffer or just an array of bright pixels?
    // Lens flare works by taking the bright parts of the image and "echoing" them across the center.

    const { threshold, intensity, artifacts, lightX, lightY } = params;

    // To improve performance and quality, we can downsample the "bright pass"
    // For simplicity here, we'll iterate.

    // Create a "bright pass" buffer - floating point to accumulate
    // Actually, generating lens flare geometry (circles, hexagons) is one way.
    // Another way is "Pseudo Lens Flare" which samples the image itself inverted across the center.
    // Let's implement the "Image-based Ghosting" technique.

    // 1. Threshold image to get bright spots.
    // 2. Generate several copies of this thresholded image.
    // 3. Scale and translate these copies towards/away from the center relative to the light source?
    // Actually, ghosts are usually symmetric around the image center.

    // Vector from Image Center to Light Source.
    const centerX = width / 2;
    const centerY = height / 2;

    // Note: The user provided `lightX, lightY`.
    // In a real lens flare, the flare is caused by bright spots in the image.
    // If the user manually picks a light source, we can just render synthetic flares (circles) along the line.
    // If we use the image content, we automatically get flares from all bright lights.
    // The prompt says "Set light source position".
    // Let's combine: We will use the provided Light Pos to define the axis,
    // BUT we can also just render synthetic aperture shapes (circles/polygons) along the axis
    // connecting LightPos and Center. This is standard "synthetic lens flare".

    // IF the instruction implies image processing, maybe we should use the "threshold" to FIND the light source?
    // But the UI lets the user pick it.
    // Let's support both or just synthetic. Synthetic is easier and often looks better for a demo.
    // However, "threshold" parameter suggests we are using image content.

    // Strategy:
    // 1. Identify bright pixels based on threshold.
    // 2. For each bright pixel (or a downsampled grid), treat it as a light source.
    // 3. This is too slow.

    // Alternative Strategy (Image Based):
    // 1. Create a "Flare Buffer" (black).
    // 2. Sample the original image. If pixel > threshold, add a "ghost" at the inverted position.
    // Ghost vector V = (Center - PixelPos).
    // Ghost position = Center + V * scale.
    // We iterate over the destination pixels? No, easier to iterate over source bright pixels and splash them.
    // But splash is write-heavy (race conditions in parallel, but here single worker).

    // Let's try "Sampling Ghosts".
    // We want to generate the output pixel color at (x,y).
    // It is Original(x,y) + Sum(Ghosts(x,y)).
    // A ghost is a scaled, tinted version of the bright parts of the image.
    // Ghost `i` corresponds to sampling the input image at coordinate `coord_i`.
    // `coord_i` is derived from `(x,y)` relative to center?
    // Actually, usually it's the other way around: The bright spot at P creates ghosts at G1, G2...

    // Let's stick to the simplest effective "Pseudo Lens Flare":
    // 1. Downsample/Extract bright parts into a texture.
    // 2. Blur it.
    // 3. Draw it multiple times additively, scaled and offset relative to image center.

    // Since we don't have GPU scaling, we do nearest neighbor or bilinear sampling.

    // Buffer for bright pass
    const brightPass = new Float32Array(width * height * 3);

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx+1];
        const b = data[idx+2];

        // Luminance or Max
        const val = Math.max(r, g, b);
        if (val > threshold) {
            brightPass[i*3] = r * intensity;
            brightPass[i*3+1] = g * intensity;
            brightPass[i*3+2] = b * intensity;
        } else {
            brightPass[i*3] = 0;
            brightPass[i*3+1] = 0;
            brightPass[i*3+2] = 0;
        }
    }

    // Now accumulate ghosts into a result accumulator
    const accumR = new Float32Array(width * height);
    const accumG = new Float32Array(width * height);
    const accumB = new Float32Array(width * height);

    // Ghost scales (arbitrary aesthetic values)
    const ghostScales = [];
    for(let i=0; i<artifacts; i++) {
        // e.g. -5, -2, -0.5, 0.5, 2...
        // Artifacts usually appear along the line through center.
        // Scale relative to image center.
        // Scale < 0 means inverted (across center).
        ghostScales.push( - (i + 1) / (artifacts/2) );
    }
    // Add some chromatic distortion per ghost?

    // Optimization: Iterate over result pixels and sample from BrightPass?
    // P_out = Center + (P_in - Center) * Scale
    // => P_in = Center + (P_out - Center) / Scale

    // Loop through pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Normalized coords -1 to 1
            const nx = (x - centerX) / centerX;
            const ny = (y - centerY) / centerY;

            let flareR = 0;
            let flareG = 0;
            let flareB = 0;

            // Calculate vignetting mask for flare (fade at edges)
            const dist = Math.sqrt(nx*nx + ny*ny);
            const mask = Math.max(0, 1 - dist); // Linear falloff from center
            const weight = mask * mask * mask; // Cubic falloff

            for (let k = 0; k < ghostScales.length; k++) {
                const scale = ghostScales[k];
                if (Math.abs(scale) < 0.01) continue;

                // Sampling coordinate
                // If ghost is at Scale relative to center...
                // We want to know what value lands at (x,y).
                // If we painted bright pass scaled by S, then at (x,y) we see bright pass content from (x,y)/S ?
                // Let's assume vector V = (P - Center).
                // Source pos = Center + V / scale.

                const srcX = (x - centerX) / scale + centerX;
                const srcY = (y - centerY) / scale + centerY;

                if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                    const sx = Math.floor(srcX);
                    const sy = Math.floor(srcY);
                    const sIdx = (sy * width + sx) * 3;

                    // Simple Chromatic Aberration for flares
                    // Tint ghosts based on index
                    const tintR = (k % 3 === 0) ? 1 : 0.5;
                    const tintG = (k % 3 === 1) ? 1 : 0.5;
                    const tintB = (k % 3 === 2) ? 1 : 0.5;

                    flareR += brightPass[sIdx] * tintR * weight;
                    flareG += brightPass[sIdx+1] * tintG * weight;
                    flareB += brightPass[sIdx+2] * tintB * weight;
                }
            }

            accumR[y*width+x] = flareR;
            accumG[y*width+x] = flareG;
            accumB[y*width+x] = flareB;
        }
    }

    // Note: We haven't used lightX/lightY explicitly in the loop above because
    // this algorithm generates flares based on *all* bright spots in the image (image-based lens flare).
    // The user's clicked "lightX/Y" is mostly ignored in this algorithm
    // UNLESS we want to add a synthetic "Star burst" at that specific location.
    // Let's add a synthetic starburst at lightX, lightY.

    // Starburst: Radial streaks from lightX, lightY.
    // For every pixel, angle = atan2(y-ly, x-lx).
    // Noise(angle) -> intensity.

    const starBurstIntensity = intensity * 255; // arbitrary scaling
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - lightX;
            const dy = y - lightY;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Avoid div by zero
            if (dist < 1) continue;

            const angle = Math.atan2(dy, dx);
            // Simple noise function based on angle
            // High frequency noise
            const noise = (Math.sin(angle * 20) + Math.cos(angle * 50 + 2)) * 0.5 + 0.5;

            // Attenuation
            const att = 1.0 / (dist * 0.05 + 1);

            // Apply to accum
            if (noise > 0.8) { // Only streaks
                 // Check if the light source itself is bright?
                 // We assume user clicked a bright spot or wants a light there.
                 const val = noise * att * starBurstIntensity;
                 accumR[y*width+x] += val;
                 accumG[y*width+x] += val * 0.9; // slightly warm
                 accumB[y*width+x] += val * 0.8;
            }
        }
    }

    // Composite
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;

        let r = resultBuffer[idx] + accumR[i];
        let g = resultBuffer[idx+1] + accumG[i];
        let b = resultBuffer[idx+2] + accumB[i];

        resultBuffer[idx] = Math.min(255, r);
        resultBuffer[idx+1] = Math.min(255, g);
        resultBuffer[idx+2] = Math.min(255, b);
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'result',
        imageData: new ImageData(resultBuffer, width, height),
        time: endTime - startTime
    });
};
