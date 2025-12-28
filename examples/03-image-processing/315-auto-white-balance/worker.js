self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;
    const total = width * height;

    // Calculate average of each channel (Gray World assumption)
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < data.length; i += 4) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
    }

    const avgR = sumR / total;
    const avgG = sumG / total;
    const avgB = sumB / total;
    const avgGray = (avgR + avgG + avgB) / 3;

    // Calculate scaling factors
    const scaleR = avgGray / avgR;
    const scaleG = avgGray / avgG;
    const scaleB = avgGray / avgB;

    // Apply
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        output[i] = Math.min(255, data[i] * scaleR);
        output[i + 1] = Math.min(255, data[i + 1] * scaleG);
        output[i + 2] = Math.min(255, data[i + 2] * scaleB);
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
