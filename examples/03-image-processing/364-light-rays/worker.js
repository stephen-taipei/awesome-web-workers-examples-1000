self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Create a new buffer for the result
    const resultBuffer = new Uint8ClampedArray(data.length);
    const pass1Buffer = new Uint8ClampedArray(data.length); // Thresholded image

    const {
        intensity, // Exposure
        decay,
        density,
        weight,
        threshold,
        lightX,
        lightY
    } = params;

    const NUM_SAMPLES = 60; // Max samples

    // Step 1: Thresholding - Extract bright areas
    // Also store original data in resultBuffer as base
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];

        // Copy original to result
        resultBuffer[i] = r;
        resultBuffer[i+1] = g;
        resultBuffer[i+2] = b;
        resultBuffer[i+3] = a;

        // Simple luminance threshold
        // const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Or simply max channel
        const maxVal = Math.max(r, g, b);

        if (maxVal > threshold) {
            pass1Buffer[i] = r;
            pass1Buffer[i+1] = g;
            pass1Buffer[i+2] = b;
            pass1Buffer[i+3] = a; // Keep alpha
        } else {
            pass1Buffer[i] = 0;
            pass1Buffer[i+1] = 0;
            pass1Buffer[i+2] = 0;
            pass1Buffer[i+3] = 0; // Transparent? Or Black? Using 0 alpha for easy compositing usually, but here we add colors.
                                  // Let's use black with full alpha or 0 alpha.
                                  // The algorithm usually samples colors. If 0, it contributes nothing.
        }
    }

    // Step 2: Radial Blur (Zoom Blur) on pass1Buffer
    // We accumulate the blur into an accumulation buffer, then add it to original

    // Using a simpler approach: per pixel, ray cast towards light source
    // This is computationally expensive in JS for large images.
    // Standard approach: Render to smaller texture? In Worker we don't have textures.
    // We iterate over pixels. To optimize, we can maybe undersample?
    // Let's try direct implementation first.

    // To avoid O(W*H*Samples) which is huge (1920*1080*60 ~ 124 million ops),
    // we need to be careful.
    // Optimization: Pre-calculate offsets? No, depends on pixel position.

    // 1D Array access helper
    function getIdx(x, y) {
        return (y * width + x) * 4;
    }

    // We can iterate over the whole image and for each pixel, sample along the line to light source.
    // Actually, "Volumetric Light" post-process effect usually works by:
    // For each pixel P:
    //   Vector V = (LightPos - P) * Density / NumSamples
    //   Coord = P
    //   IlluminationDecay = 1.0
    //   AccumulatedColor = 0
    //   For i = 0 to NumSamples:
    //     Coord -= V
    //     Sample = Texture(Coord)
    //     Sample *= IlluminationDecay * Weight
    //     AccumulatedColor += Sample
    //     IlluminationDecay *= Decay
    //   Final = Original(P) + AccumulatedColor * Exposure

    // Since we are in CPU, sampling arbitrarily (Coord) requires bilinear interpolation or nearest neighbor.
    // Nearest neighbor is faster.

    const accumR = new Float32Array(width * height);
    const accumG = new Float32Array(width * height);
    const accumB = new Float32Array(width * height);

    // To speed up, we can limit samples or jump pixels?
    // Let's use nearest neighbor for sampling `pass1Buffer`.

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Vector from pixel to light
            let deltaX = lightX - x;
            let deltaY = lightY - y;

            // Adjust by density
            deltaX *= density / NUM_SAMPLES;
            deltaY *= density / NUM_SAMPLES;

            let curX = x;
            let curY = y;
            let illuminationDecay = 1.0;

            let rSum = 0;
            let gSum = 0;
            let bSum = 0;

            for (let i = 0; i < NUM_SAMPLES; i++) {
                curX -= deltaX;
                curY -= deltaY;

                // Clamp coordinates
                const sX = Math.round(curX);
                const sY = Math.round(curY);

                if (sX >= 0 && sX < width && sY >= 0 && sY < height) {
                    const sIdx = (sY * width + sX) * 4;
                    // Sample from thresholded buffer
                    const sR = pass1Buffer[sIdx];
                    const sG = pass1Buffer[sIdx+1];
                    const sB = pass1Buffer[sIdx+2];

                    rSum += sR * illuminationDecay * weight;
                    gSum += sG * illuminationDecay * weight;
                    bSum += sB * illuminationDecay * weight;
                }

                illuminationDecay *= decay;
            }

            accumR[y*width + x] = rSum * intensity;
            accumG[y*width + x] = gSum * intensity;
            accumB[y*width + x] = bSum * intensity;
        }
    }

    // Step 3: Composite
    for (let i = 0; i < data.length; i += 4) {
        const pixelIdx = i / 4;

        // Additive blending
        let r = resultBuffer[i] + accumR[pixelIdx];
        let g = resultBuffer[i+1] + accumG[pixelIdx];
        let b = resultBuffer[i+2] + accumB[pixelIdx];

        // Clamp
        resultBuffer[i] = Math.min(255, r);
        resultBuffer[i+1] = Math.min(255, g);
        resultBuffer[i+2] = Math.min(255, b);
        // Alpha remains
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        imageData: new ImageData(resultBuffer, width, height),
        time: endTime - startTime
    });
};
