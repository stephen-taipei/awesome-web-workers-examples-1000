self.onmessage = function(e) {
    const { imageData, wipe, direction } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let showOriginal = true;

            switch (direction) {
                case 'left':
                    showOriginal = x / width < wipe;
                    break;
                case 'right':
                    showOriginal = x / width > (1 - wipe);
                    break;
                case 'top':
                    showOriginal = y / height < wipe;
                    break;
                case 'bottom':
                    showOriginal = y / height > (1 - wipe);
                    break;
            }

            if (showOriginal) {
                output[idx] = data[idx];
                output[idx + 1] = data[idx + 1];
                output[idx + 2] = data[idx + 2];
            } else {
                // Show sepia version as "wiped to" state
                const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                output[idx] = Math.min(255, gray * 1.2);
                output[idx + 1] = gray;
                output[idx + 2] = gray * 0.8;
            }
            output[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
