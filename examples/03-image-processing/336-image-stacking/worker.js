self.onmessage = function(e) {
    const { images } = e.data;
    if (!images.length) return;

    const count = images.length;
    const width = images[0].width;
    const height = images[0].height;

    // Check dimensions match
    for (let i = 1; i < count; i++) {
        if (images[i].width !== width || images[i].height !== height) {
            // Error or skip? We'll assume strict match for now.
            return;
        }
    }

    // Accumulate
    // We use Float32 to avoid overflow during sum
    const size = width * height * 4;
    const accum = new Float32Array(size);

    for (let i = 0; i < count; i++) {
        const data = images[i].data;
        for (let j = 0; j < size; j++) {
            accum[j] += data[j];
        }
    }

    // Average
    const result = new Uint8ClampedArray(size);
    for (let j = 0; j < size; j++) {
        result[j] = accum[j] / count;
    }

    // Fix alpha if needed (usually we want full opacity if inputs are opaque)
    // But averaging alpha is also correct if inputs vary.
    // If all are 255 alpha, result is 255.

    const finalImageData = new ImageData(result, width, height);
    self.postMessage({ imageData: finalImageData });
};
