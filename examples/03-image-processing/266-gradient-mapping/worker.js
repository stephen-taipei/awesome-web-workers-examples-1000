const gradients = {
    sunset: [[255,94,77], [255,154,0], [255,206,84]],
    ocean: [[0,63,92], [0,150,199], [102,204,255]],
    forest: [[27,94,32], [56,142,60], [129,199,132]],
    fire: [[139,0,0], [255,69,0], [255,215,0]],
    purple: [[75,0,130], [138,43,226], [255,105,180]],
    mono: [[0,0,0], [128,128,128], [255,255,255]]
};

function interpolate(colors, t) {
    const n = colors.length - 1;
    const i = Math.min(Math.floor(t * n), n - 1);
    const f = t * n - i;
    return [
        Math.round(colors[i][0] + f * (colors[i+1][0] - colors[i][0])),
        Math.round(colors[i][1] + f * (colors[i+1][1] - colors[i][1])),
        Math.round(colors[i][2] + f * (colors[i+1][2] - colors[i][2]))
    ];
}

self.onmessage = function(e) {
    const { imageData, gradient } = e.data;
    const data = imageData.data;
    const colors = gradients[gradient] || gradients.sunset;

    for (let i = 0; i < data.length; i += 4) {
        const gray = (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]) / 255;
        const [r, g, b] = interpolate(colors, gray);
        data[i] = r;
        data[i+1] = g;
        data[i+2] = b;
    }

    self.postMessage({ imageData });
};
