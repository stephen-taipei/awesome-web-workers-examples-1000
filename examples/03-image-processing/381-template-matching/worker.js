self.onmessage = function(e) {
    const { mainImage, templateImage, threshold } = e.data;
    const { width: mw, height: mh, data: mData } = mainImage;
    const { width: tw, height: th, data: tData } = templateImage;

    // Convert to grayscale
    const mainGray = new Float32Array(mw * mh);
    const templateGray = new Float32Array(tw * th);

    for (let i = 0; i < mData.length; i += 4) {
        mainGray[i / 4] = 0.299 * mData[i] + 0.587 * mData[i + 1] + 0.114 * mData[i + 2];
    }
    for (let i = 0; i < tData.length; i += 4) {
        templateGray[i / 4] = 0.299 * tData[i] + 0.587 * tData[i + 1] + 0.114 * tData[i + 2];
    }

    // Calculate template mean and std
    let templateMean = 0;
    for (let i = 0; i < templateGray.length; i++) {
        templateMean += templateGray[i];
    }
    templateMean /= templateGray.length;

    let templateStd = 0;
    for (let i = 0; i < templateGray.length; i++) {
        templateStd += Math.pow(templateGray[i] - templateMean, 2);
    }
    templateStd = Math.sqrt(templateStd);

    // NCC matching
    let bestScore = -1;
    let bestX = 0, bestY = 0;
    const matches = [];

    for (let y = 0; y <= mh - th; y++) {
        for (let x = 0; x <= mw - tw; x++) {
            // Calculate window mean
            let windowMean = 0;
            for (let ty = 0; ty < th; ty++) {
                for (let tx = 0; tx < tw; tx++) {
                    windowMean += mainGray[(y + ty) * mw + (x + tx)];
                }
            }
            windowMean /= (tw * th);

            // Calculate NCC
            let numerator = 0;
            let windowStd = 0;

            for (let ty = 0; ty < th; ty++) {
                for (let tx = 0; tx < tw; tx++) {
                    const mVal = mainGray[(y + ty) * mw + (x + tx)] - windowMean;
                    const tVal = templateGray[ty * tw + tx] - templateMean;
                    numerator += mVal * tVal;
                    windowStd += mVal * mVal;
                }
            }
            windowStd = Math.sqrt(windowStd);

            const score = (templateStd * windowStd > 0) ? numerator / (templateStd * windowStd) : 0;

            if (score > bestScore) {
                bestScore = score;
                bestX = x;
                bestY = y;
            }

            if (score >= threshold) {
                matches.push({ x, y, score });
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(mData);

    // Draw best match rectangle
    const drawRect = (x, y, w, h, r, g, b) => {
        // Top and bottom
        for (let dx = 0; dx < w; dx++) {
            if (x + dx >= 0 && x + dx < mw) {
                if (y >= 0 && y < mh) {
                    const idx = (y * mw + x + dx) * 4;
                    output[idx] = r; output[idx + 1] = g; output[idx + 2] = b;
                }
                if (y + h - 1 >= 0 && y + h - 1 < mh) {
                    const idx = ((y + h - 1) * mw + x + dx) * 4;
                    output[idx] = r; output[idx + 1] = g; output[idx + 2] = b;
                }
            }
        }
        // Left and right
        for (let dy = 0; dy < h; dy++) {
            if (y + dy >= 0 && y + dy < mh) {
                if (x >= 0 && x < mw) {
                    const idx = ((y + dy) * mw + x) * 4;
                    output[idx] = r; output[idx + 1] = g; output[idx + 2] = b;
                }
                if (x + w - 1 >= 0 && x + w - 1 < mw) {
                    const idx = ((y + dy) * mw + x + w - 1) * 4;
                    output[idx] = r; output[idx + 1] = g; output[idx + 2] = b;
                }
            }
        }
    };

    // Draw best match
    for (let t = 0; t < 2; t++) {
        drawRect(bestX - t, bestY - t, tw + t * 2, th + t * 2, 255, 0, 0);
    }

    self.postMessage({
        imageData: new ImageData(output, mw, mh),
        score: bestScore
    });
};
