// Stereoscopic Projection - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    if (type === 'process') {
        try {
            const result = generateAnaglyph(imageData, params);
            self.postMessage({
                type: 'result',
                data: result
            });
        } catch (error) {
            self.postMessage({
                type: 'error',
                data: { error: error.message }
            });
        }
    }
};

function generateAnaglyph(imageData, params) {
    const startTime = performance.now();
    const { width, height, data } = imageData;
    const { parallax } = params;

    const outputData = new Uint8ClampedArray(data.length);
    const progressInterval = Math.floor(height / 20);

    // Anaglyph (Red-Cyan)
    // Left eye -> Red channel
    // Right eye -> Cyan (Green + Blue) channels

    // We simulate depth by shifting the original image.
    // If we assume the whole image is at a certain depth relative to screen plane.
    // For a real 3D effect from a single 2D image, we would need a depth map.
    // Here we implement a "Fake 3D" or allow shifting the entire image plane.
    // However, usually "Parallax" implies some differential shift?
    // If the input is just one image, shifting it uniformly just moves the image.

    // But maybe we can assume a simple depth gradient (e.g. ground plane)?
    // Or just shift the Red channel left and Cyan right to create "out of screen" or "into screen" effect for the whole plate.
    // Let's implement uniform shift for the whole image (simulate a flat poster at a specific depth).

    // Left Eye Image: Shifted by -parallax/2
    // Right Eye Image: Shifted by +parallax/2

    const shift = Math.round(parallax / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const destIndex = (y * width + x) * 4;

            // Calculate coordinates for Left and Right eyes
            let xLeft = x + shift;  // If parallax > 0 (recede), Left eye sees image shifted Right?
                                    // Wait. Convergence.
                                    // If object is far (behind screen), Left eye sees it to the Left of where Right eye sees it.
                                    // So Left Image pixel should be to the Left of Right Image pixel.
                                    // If we shift the SAME source image:
                                    // Left View: Sample from Right? (x + shift)
                                    // Right View: Sample from Left? (x - shift)

            let xRight = x - shift;

            // Clamp or Wrap? Clamp looks better usually.
            xLeft = Math.max(0, Math.min(width - 1, xLeft));
            xRight = Math.max(0, Math.min(width - 1, xRight));

            const idxLeft = (y * width + xLeft) * 4;
            const idxRight = (y * width + xRight) * 4;

            // Get colors
            // Left Eye sees Red
            const r = data[idxLeft];

            // Right Eye sees Cyan (Green + Blue)
            // We use the Green and Blue from the "Right Eye View"
            const g = data[idxRight + 1];
            const b = data[idxRight + 2];

            // Dubios method is better matrix multiplication, but simple channel split is:
            // R_out = R_left
            // G_out = G_right
            // B_out = B_right

            outputData[destIndex] = r;
            outputData[destIndex + 1] = g;
            outputData[destIndex + 2] = b;
            outputData[destIndex + 3] = 255;
        }

        if (y % progressInterval === 0) {
            self.postMessage({
                type: 'progress',
                data: { percent: Math.round((y / height) * 100) }
            });
        }
    }

    const executionTime = performance.now() - startTime;

    return {
        processedData: outputData.buffer,
        executionTime
    };
}
