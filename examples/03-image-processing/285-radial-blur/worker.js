self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const cx = width / 2, cy = height / 2;
    const samples = strength;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            const angle = Math.atan2(y - cy, x - cx);
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            for (let i = 0; i < samples; i++) {
                const a = angle + (i - samples / 2) * 0.01;
                const sx = Math.round(cx + dist * Math.cos(a));
                const sy = Math.round(cy + dist * Math.sin(a));

                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const idx = (sy * width + sx) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = r / samples;
            output[idx + 1] = g / samples;
            output[idx + 2] = b / samples;
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
