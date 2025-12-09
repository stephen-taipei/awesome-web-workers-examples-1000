// Wave Deformation - Worker Thread

self.onmessage = function(e) {
    if (e.data.type === 'wave') {
        const { imageData, params } = e.data;
        const result = applyWave(imageData, params);
        self.postMessage({
            type: 'result',
            ...result
        });
    }
};

function applyWave(srcImageData, params) {
    const startTime = performance.now();

    const { amplitude, frequency, phase, direction } = params;
    const w = srcImageData.width;
    const h = srcImageData.height;
    const srcData = new Uint8ClampedArray(srcImageData.data);
    const destData = new Uint8ClampedArray(w * h * 4);

    // Wave function: offset = A * sin(freq * coord + phase)

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const destIdx = (y * w + x) * 4;

            let srcX = x;
            let srcY = y;

            if (direction === 'horizontal') {
                // Shift X based on Y
                // Or shift Y based on X?
                // "Horizontal Waves" usually means the wave propagates horizontally, so Y is shifted?
                // Or lines become wavy horizontally?
                // Let's assume standard "Wave effect":
                // Shift X based on sin(y) -> vertical lines become wavy
                // Shift Y based on sin(x) -> horizontal lines become wavy

                // Let's interpret "Horizontal Waves" as waves moving horizontally (like water surface), so Y displacement depends on X.
                const offset = amplitude * Math.sin(x * frequency + phase);
                srcY = y + offset;
            } else if (direction === 'vertical') {
                // Vertical waves: waves moving vertically. X displacement depends on Y.
                const offset = amplitude * Math.sin(y * frequency + phase);
                srcX = x + offset;
            } else if (direction === 'both') {
                const offX = amplitude * Math.sin(y * frequency + phase);
                const offY = amplitude * Math.sin(x * frequency + phase);
                srcX = x + offX;
                srcY = y + offY;
            }

            // Bilinear Interpolation
            if (srcX >= 0 && srcX < w - 1 && srcY >= 0 && srcY < h - 1) {
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const dx = srcX - x0;
                const dy = srcY - y0;

                const idx00 = (y0 * w + x0) * 4;
                const idx10 = (y0 * w + x0 + 1) * 4;
                const idx01 = ((y0 + 1) * w + x0) * 4;
                const idx11 = ((y0 + 1) * w + x0 + 1) * 4;

                for (let c = 0; c < 4; c++) {
                    const top = srcData[idx00 + c] * (1 - dx) + srcData[idx10 + c] * dx;
                    const bot = srcData[idx01 + c] * (1 - dx) + srcData[idx11 + c] * dx;
                    destData[destIdx + c] = top * (1 - dy) + bot * dy;
                }
            } else {
                destData[destIdx + 3] = 0;
            }
        }
    }

    return {
        imageData: destData.buffer,
        width: w,
        height: h,
        executionTime: performance.now() - startTime
    };
}
