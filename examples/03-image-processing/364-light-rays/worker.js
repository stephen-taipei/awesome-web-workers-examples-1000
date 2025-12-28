self.onmessage = function(e) {
    const { imageData, lightX, lightY, intensity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const cx = width * lightX, cy = height * lightY;
    const samples = 50;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let r = data[idx], g = data[idx + 1], b = data[idx + 2];

            // Radial blur toward light source
            const dx = cx - x, dy = cy - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = Math.sqrt(width * width + height * height);
            const factor = (dist / maxDist) * intensity;

            let sumR = r, sumG = g, sumB = b;
            for (let s = 1; s < samples; s++) {
                const t = (s / samples) * factor * 0.5;
                const sx = Math.min(Math.max(Math.round(x + dx * t), 0), width - 1);
                const sy = Math.min(Math.max(Math.round(y + dy * t), 0), height - 1);
                const sidx = (sy * width + sx) * 4;
                sumR += data[sidx];
                sumG += data[sidx + 1];
                sumB += data[sidx + 2];
            }

            output[idx] = Math.min(255, sumR / samples + factor * 30);
            output[idx + 1] = Math.min(255, sumG / samples + factor * 25);
            output[idx + 2] = Math.min(255, sumB / samples + factor * 15);
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
