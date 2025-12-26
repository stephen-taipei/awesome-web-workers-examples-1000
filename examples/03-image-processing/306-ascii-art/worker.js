const chars = ' .:-=+*#%@';

self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;
    let ascii = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const charIdx = Math.floor((gray / 255) * (chars.length - 1));
            ascii += chars[charIdx];
        }
        ascii += '\n';
    }

    self.postMessage({ ascii });
};
