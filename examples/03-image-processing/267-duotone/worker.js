function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

self.onmessage = function(e) {
    const { imageData, darkColor, lightColor } = e.data;
    const data = imageData.data;
    const dark = hexToRgb(darkColor);
    const light = hexToRgb(lightColor);

    for (let i = 0; i < data.length; i += 4) {
        const gray = (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]) / 255;
        data[i] = Math.round(dark[0] + gray * (light[0] - dark[0]));
        data[i+1] = Math.round(dark[1] + gray * (light[1] - dark[1]));
        data[i+2] = Math.round(dark[2] + gray * (light[2] - dark[2]));
    }

    self.postMessage({ imageData });
};
