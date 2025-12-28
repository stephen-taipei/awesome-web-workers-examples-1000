self.onmessage = function(e) {
    const { imageData } = e.data;
    const { data } = imageData;
    const rHist = new Uint32Array(256);
    const gHist = new Uint32Array(256);
    const bHist = new Uint32Array(256);

    for (let i = 0; i < data.length; i += 4) {
        rHist[data[i]]++;
        gHist[data[i + 1]]++;
        bHist[data[i + 2]]++;
    }

    self.postMessage({ rHist: Array.from(rHist), gHist: Array.from(gHist), bHist: Array.from(bHist) });
};
