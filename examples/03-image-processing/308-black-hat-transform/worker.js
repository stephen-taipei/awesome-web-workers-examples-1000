self.onmessage = function(e) {
    const { imageData, shape, size } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;

    // Convert to grayscale first if not already?
    // Usually morphology is done on grayscale or binary, but can be done on channels.
    // For simplicity and common use case (black-hat extracts details),
    // let's process per channel (RGB) but usually it's better on grayscale.
    // However, to keep image color structure if any, we'll process RGB independent.
    // Or we can convert to grayscale, process, and return grayscale.
    // The previous examples often keep RGBA.

    // Let's implement grayscale conversion internally for structure element logic simply,
    // OR we process each channel R, G, B independently.
    // Processing RGB independently creates color artifacts sometimes but is valid for "vector" morphology.
    // Let's do per-channel for generality.

    // 1. Dilation
    const dilated = new Uint8ClampedArray(src.length);
    applyMorphology(src, dilated, width, height, shape, size, 'dilation');

    self.postMessage({ type: 'progress', progress: 50 });

    // 2. Erosion (on dilated image) -> Closing
    const closed = new Uint8ClampedArray(src.length);
    applyMorphology(dilated, closed, width, height, shape, size, 'erosion');

    self.postMessage({ type: 'progress', progress: 90 });

    // 3. Black-hat = Closing - Original
    const resultData = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
        resultData[i] = clamp(closed[i] - src[i]);     // R
        resultData[i+1] = clamp(closed[i+1] - src[i+1]); // G
        resultData[i+2] = clamp(closed[i+2] - src[i+2]); // B
        resultData[i+3] = src[i+3]; // Alpha
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(resultData, width, height),
        duration: Math.round(endTime - startTime)
    });
};

function clamp(val) {
    return Math.max(0, Math.min(255, val));
}

function applyMorphology(src, dst, width, height, shape, size, operation) {
    // struct element size: radius
    // kernel width = 2*size + 1
    const radius = size;

    // Precompute offsets for the kernel
    const offsets = [];
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (shape === 'disk') {
                if (dx*dx + dy*dy <= radius*radius) {
                    offsets.push({dx, dy});
                }
            } else {
                // Square
                offsets.push({dx, dy});
            }
        }
    }

    // Since morphology is separable for max/min in some cases but generic is not easily separable without specific algorithms.
    // We use naive implementation for simplicity. O(N*K) where K is kernel area.

    // Optimization: Don't process Alpha channel for morphology usually, just copy it?
    // We already loop i+=4.

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let idx = (y * width + x) * 4;

            let rVal = (operation === 'dilation') ? -1 : 256;
            let gVal = (operation === 'dilation') ? -1 : 256;
            let bVal = (operation === 'dilation') ? -1 : 256;

            for (let i = 0; i < offsets.length; i++) {
                const off = offsets[i];
                const ny = y + off.dy;
                const nx = x + off.dx;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = (ny * width + nx) * 4;
                    const nr = src[nIdx];
                    const ng = src[nIdx+1];
                    const nb = src[nIdx+2];

                    if (operation === 'dilation') {
                        if (nr > rVal) rVal = nr;
                        if (ng > gVal) gVal = ng;
                        if (nb > bVal) bVal = nb;
                    } else {
                        if (nr < rVal) rVal = nr;
                        if (ng < gVal) gVal = ng;
                        if (nb < bVal) bVal = nb;
                    }
                }
            }

            dst[idx] = rVal;
            dst[idx+1] = gVal;
            dst[idx+2] = bVal;
            dst[idx+3] = src[idx+3];
        }
    }
}
