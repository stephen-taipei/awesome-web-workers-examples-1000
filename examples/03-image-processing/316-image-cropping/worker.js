// Image Cropping - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, x, y, width, height } = e.data;

    if (type === 'crop') {
        const result = cropImage(imageData, x, y, width, height);
        self.postMessage({
            type: 'result',
            data: result
        });
    }
};

function cropImage(imageData, cropX, cropY, cropWidth, cropHeight) {
    const startTime = performance.now();

    const srcWidth = imageData.width;
    const srcHeight = imageData.height;
    const srcData = new Uint8ClampedArray(imageData.data);

    // Ensure bounds
    cropX = Math.max(0, cropX);
    cropY = Math.max(0, cropY);
    cropWidth = Math.min(cropWidth, srcWidth - cropX);
    cropHeight = Math.min(cropHeight, srcHeight - cropY);

    if (cropWidth <= 0 || cropHeight <= 0) {
        throw new Error("Invalid crop dimensions");
    }

    const destData = new Uint8ClampedArray(cropWidth * cropHeight * 4);

    for (let row = 0; row < cropHeight; row++) {
        const srcRowStart = ((cropY + row) * srcWidth + cropX) * 4;
        const destRowStart = (row * cropWidth) * 4;
        const rowLength = cropWidth * 4;

        // Copy row
        for (let i = 0; i < rowLength; i++) {
            destData[destRowStart + i] = srcData[srcRowStart + i];
        }

        // Alternative using subarray for better performance (if supported/applicable for TypedArray copying)
        // destData.set(srcData.subarray(srcRowStart, srcRowStart + rowLength), destRowStart);
    }

    const executionTime = performance.now() - startTime;

    return {
        croppedImageData: destData.buffer,
        width: cropWidth,
        height: cropHeight,
        executionTime
    };
}
