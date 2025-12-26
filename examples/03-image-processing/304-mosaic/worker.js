self.onmessage = function(e) {
    const { imageData, tileSize } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let ty = 0; ty < height; ty += tileSize) {
        for (let tx = 0; tx < width; tx += tileSize) {
            let r = 0, g = 0, b = 0, count = 0;

            // Calculate average color
            for (let y = ty; y < ty + tileSize && y < height; y++) {
                for (let x = tx; x < tx + tileSize && x < width; x++) {
                    const idx = (y * width + x) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    count++;
                }
            }

            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            // Fill tile with average color
            for (let y = ty; y < ty + tileSize && y < height; y++) {
                for (let x = tx; x < tx + tileSize && x < width; x++) {
                    const idx = (y * width + x) * 4;
                    output[idx] = r;
                    output[idx + 1] = g;
                    output[idx + 2] = b;
                    output[idx + 3] = 255;
                }
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
