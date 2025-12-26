self.onmessage = function(e) {
    const { imageData } = e.data;
    const startTime = performance.now();

    const data = imageData.data;
    const len = data.length;

    // Initialize histograms (256 bins each)
    const rHist = new Uint32Array(256);
    const gHist = new Uint32Array(256);
    const bHist = new Uint32Array(256);
    const lHist = new Uint32Array(256);

    let totalLuma = 0;

    for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        // data[i+3] is alpha, ignore

        rHist[r]++;
        gHist[g]++;
        bHist[b]++;

        // Calculate Luminance (standard Rec. 601)
        const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        lHist[luma]++;
        totalLuma += luma;
    }

    const pixelCount = len / 4;
    const avgLuma = totalLuma / pixelCount;

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        histograms: {
            r: rHist,
            g: gHist,
            b: bHist,
            l: lHist
        },
        stats: {
            pixelCount: pixelCount,
            avgLuma: avgLuma
        },
        time: endTime - startTime
    });
};
