/**
 * Emboss Effect Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'APPLY_EMBOSS':
            applyEmboss(payload);
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知的訊息類型: ${type}` } });
    }
};

function applyEmboss(payload) {
    const { imageData, direction, strength, grayscale } = payload;
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const srcData = new Uint8ClampedArray(imageData.data);
    const dstData = new Uint8ClampedArray(srcData.length);

    // Emboss Kernels (3x3)
    // The sum should be 0.
    // Basic idea: Light comes from one side, creating shadow on the other.

    let kernel = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Using strength to scale the kernel weights
    const s = strength;

    switch (direction) {
        case 'top-left':
            kernel = [-2*s, -1*s, 0, -1*s, 1, 1*s, 0, 1*s, 2*s];
            break;
        case 'top':
            kernel = [0, -2*s, 0, -1*s, 1, -1*s, 0, 2*s, 0]; // Modified logic slightly
            // Standard Top Emboss:
            //  0 -1  0
            //  0  0  0
            //  0  1  0
            // Scaled:
            kernel = [0, -1*s, 0, 0, 0, 0, 0, 1*s, 0];
            break;
        case 'top-right':
            kernel = [0, -1*s, -2*s, 1*s, 1, -1*s, 2*s, 1*s, 0];
            break;
        case 'left':
            kernel = [-2*s, 0, 0, -1*s, 1, 1*s, 0, 0, 2*s]; // Weird.
            // Standard Left:
            // -1  0  1
            // -2  0  2
            // -1  0  1
            // Let's use simple directional difference
            // -s  0  s
            // -s  0  s
            // -s  0  s
            kernel = [-1*s, 0, 1*s, -2*s, 0, 2*s, -1*s, 0, 1*s];
            break;
        case 'right':
            kernel = [1*s, 0, -1*s, 2*s, 0, -2*s, 1*s, 0, -1*s];
            break;
        default: // top-left
             kernel = [-2*s, -1*s, 0, -1*s, 1, 1*s, 0, 1*s, 2*s];
    }

    // Actually, "Emboss" usually adds 128 to the result.
    // Convolution result + 128.

    // Re-defining standard emboss kernel for top-left (135 degree)
    // -2 -1  0
    // -1  1  1
    //  0  1  2
    // The center '1' is to preserve some original image info?
    // Pure emboss usually has 0 in center.
    // Let's use 0 in center for pure difference.

    if (direction === 'top-left') {
        kernel = [-s, -s, 0, -s, 0, s, 0, s, s];
    } else if (direction === 'top') {
        kernel = [0, -s, 0, 0, 0, 0, 0, s, 0];
    } else if (direction === 'top-right') {
        kernel = [0, -s, -s, s, 0, -s, s, s, 0];
    } else if (direction === 'left') {
        kernel = [-s, 0, s, -s, 0, s, -s, 0, s]; // This is Prewitt-like
    } else if (direction === 'right') {
        kernel = [s, 0, -s, s, 0, -s, s, 0, -s];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                        r += srcData[idx] * weight;
                        g += srcData[idx+1] * weight;
                        b += srcData[idx+2] * weight;
                    }
                }
            }

            // Offset by 128
            r += 128;
            g += 128;
            b += 128;

            if (grayscale) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = g = b = gray;
            }

            const idx = (y * width + x) * 4;
            dstData[idx] = Math.max(0, Math.min(255, r));
            dstData[idx+1] = Math.max(0, Math.min(255, g));
            dstData[idx+2] = Math.max(0, Math.min(255, b));
            dstData[idx+3] = srcData[idx+3];
        }

        if (y % 50 === 0) {
            self.postMessage({ type: 'PROGRESS', payload: { percent: Math.round(y/height*100), message: '處理中...' } });
        }
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: new ImageData(dstData, width, height),
            direction,
            strength,
            duration: endTime - startTime
        }
    }, [dstData.buffer]);
}
