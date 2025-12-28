self.onmessage = function(e) {
    const { imageData, numColors } = e.data;
    const { data } = imageData;

    // Collect unique colors (sampled)
    const colorCounts = {};
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
        const r = Math.floor(data[i] / 32) * 32;
        const g = Math.floor(data[i + 1] / 32) * 32;
        const b = Math.floor(data[i + 2] / 32) * 32;
        const key = `${r},${g},${b}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Sort by frequency and take top colors
    const sorted = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, numColors)
        .map(([key]) => key.split(',').map(Number));

    self.postMessage({ colors: sorted });
};
