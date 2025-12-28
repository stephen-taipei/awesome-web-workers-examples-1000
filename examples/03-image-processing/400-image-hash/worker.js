self.onmessage = function(e) {
    const { imageData, imageNum } = e.data;
    const hash = calculatePHash(imageData);

    self.postMessage({ hash, imageNum });
};

function calculatePHash(imageData) {
    const { data } = imageData;

    // Step 1: Resize to 8x8 (we'll use simple averaging)
    const size = 8;
    const resized = resize(imageData, size, size);

    // Step 2: Convert to grayscale
    const gray = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
        gray[i] = 0.299 * resized[i * 4] + 0.587 * resized[i * 4 + 1] + 0.114 * resized[i * 4 + 2];
    }

    // Step 3: Calculate DCT (Discrete Cosine Transform)
    const dct = calculateDCT(gray, size);

    // Step 4: Take top-left 8x8 of DCT (excluding DC component)
    // Calculate mean of DCT values (excluding DC)
    let sum = 0;
    for (let i = 1; i < size * size; i++) {
        sum += dct[i];
    }
    const mean = sum / (size * size - 1);

    // Step 5: Generate hash
    let hash = '';
    for (let i = 0; i < size * size; i++) {
        hash += dct[i] > mean ? '1' : '0';
    }

    // Convert binary to hex
    let hexHash = '';
    for (let i = 0; i < hash.length; i += 4) {
        hexHash += parseInt(hash.substr(i, 4), 2).toString(16);
    }

    return hexHash;
}

function resize(imageData, newWidth, newHeight) {
    const { width, height, data } = imageData;
    const result = new Uint8ClampedArray(newWidth * newHeight * 4);

    const xRatio = width / newWidth;
    const yRatio = height / newHeight;

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            // Calculate source region
            const srcX = Math.floor(x * xRatio);
            const srcY = Math.floor(y * yRatio);
            const srcX2 = Math.min(Math.floor((x + 1) * xRatio), width);
            const srcY2 = Math.min(Math.floor((y + 1) * yRatio), height);

            // Average pixels in source region
            let r = 0, g = 0, b = 0, count = 0;

            for (let sy = srcY; sy < srcY2; sy++) {
                for (let sx = srcX; sx < srcX2; sx++) {
                    const idx = (sy * width + sx) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    count++;
                }
            }

            if (count > 0) {
                const dstIdx = (y * newWidth + x) * 4;
                result[dstIdx] = r / count;
                result[dstIdx + 1] = g / count;
                result[dstIdx + 2] = b / count;
                result[dstIdx + 3] = 255;
            }
        }
    }

    return result;
}

function calculateDCT(input, size) {
    const output = new Float32Array(size * size);

    for (let u = 0; u < size; u++) {
        for (let v = 0; v < size; v++) {
            let sum = 0;

            for (let x = 0; x < size; x++) {
                for (let y = 0; y < size; y++) {
                    sum += input[y * size + x] *
                           Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
                           Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
                }
            }

            const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
            const cv = v === 0 ? 1 / Math.sqrt(2) : 1;

            output[u * size + v] = (2 / size) * cu * cv * sum;
        }
    }

    return output;
}
