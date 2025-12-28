self.onmessage = function(e) {
    const { image1, image2 } = e.data;
    const { width, height, data: data1 } = image1;
    const { data: data2 } = image2;

    // Calculate MSE and PSNR
    let mse = 0;
    for (let i = 0; i < data1.length; i += 4) {
        mse += Math.pow(data1[i] - data2[i], 2);
        mse += Math.pow(data1[i + 1] - data2[i + 1], 2);
        mse += Math.pow(data1[i + 2] - data2[i + 2], 2);
    }
    mse /= (width * height * 3);

    const psnr = mse > 0 ? 10 * Math.log10(255 * 255 / mse) : Infinity;

    // Calculate SSIM
    const ssim = calculateSSIM(data1, data2, width, height);

    // Create difference image
    const diffData = new Uint8ClampedArray(data1.length);

    for (let i = 0; i < data1.length; i += 4) {
        const dr = Math.abs(data1[i] - data2[i]);
        const dg = Math.abs(data1[i + 1] - data2[i + 1]);
        const db = Math.abs(data1[i + 2] - data2[i + 2]);
        const diff = (dr + dg + db) / 3;

        // Highlight differences in red
        diffData[i] = Math.min(255, diff * 5);
        diffData[i + 1] = 0;
        diffData[i + 2] = 0;
        diffData[i + 3] = 255;
    }

    self.postMessage({
        diffImage: new ImageData(diffData, width, height),
        ssim,
        psnr
    });
};

function calculateSSIM(data1, data2, width, height) {
    // Convert to grayscale
    const gray1 = new Float32Array(width * height);
    const gray2 = new Float32Array(width * height);

    for (let i = 0; i < data1.length; i += 4) {
        const idx = i / 4;
        gray1[idx] = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
        gray2[idx] = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
    }

    // Calculate means
    let mean1 = 0, mean2 = 0;
    for (let i = 0; i < gray1.length; i++) {
        mean1 += gray1[i];
        mean2 += gray2[i];
    }
    mean1 /= gray1.length;
    mean2 /= gray2.length;

    // Calculate variances and covariance
    let var1 = 0, var2 = 0, covar = 0;
    for (let i = 0; i < gray1.length; i++) {
        const d1 = gray1[i] - mean1;
        const d2 = gray2[i] - mean2;
        var1 += d1 * d1;
        var2 += d2 * d2;
        covar += d1 * d2;
    }
    var1 /= gray1.length;
    var2 /= gray2.length;
    covar /= gray1.length;

    // SSIM constants
    const C1 = Math.pow(0.01 * 255, 2);
    const C2 = Math.pow(0.03 * 255, 2);

    // Calculate SSIM
    const numerator = (2 * mean1 * mean2 + C1) * (2 * covar + C2);
    const denominator = (mean1 * mean1 + mean2 * mean2 + C1) * (var1 + var2 + C2);

    return numerator / denominator;
}
