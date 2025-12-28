self.onmessage = function(e) {
    const { imageData, cols } = e.data;
    const { width, height, data } = imageData;

    const chars = ' .:-=+*#%@';
    const cellWidth = width / cols;
    const cellHeight = cellWidth * 2; // ASCII chars are taller than wide
    const rows = Math.floor(height / cellHeight);

    let ascii = '';

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = Math.floor(col * cellWidth);
            const y = Math.floor(row * cellHeight);

            // Calculate average brightness in this cell
            let brightness = 0;
            let count = 0;

            for (let dy = 0; dy < cellHeight && y + dy < height; dy++) {
                for (let dx = 0; dx < cellWidth && x + dx < width; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                    brightness += (r + g + b) / 3;
                    count++;
                }
            }

            brightness = brightness / count / 255;
            const charIdx = Math.floor(brightness * (chars.length - 1));
            ascii += chars[charIdx];
        }
        ascii += '\n';
    }

    self.postMessage({ ascii });
};
