function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

self.onmessage = function(e) {
    const { imageData, strength, type } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        if (type === 'gaussian') {
            const noise = gaussianRandom() * strength;
            r = Math.min(255, Math.max(0, r + noise));
            g = Math.min(255, Math.max(0, g + noise));
            b = Math.min(255, Math.max(0, b + noise));
        } else if (type === 'salt-pepper') {
            const rand = Math.random();
            const prob = strength / 500;
            if (rand < prob) { r = g = b = 255; }
            else if (rand < prob * 2) { r = g = b = 0; }
        } else {
            const noise = (Math.random() - 0.5) * strength * 2;
            r = Math.min(255, Math.max(0, r + noise));
            g = Math.min(255, Math.max(0, g + noise));
            b = Math.min(255, Math.max(0, b + noise));
        }

        output[i] = r;
        output[i + 1] = g;
        output[i + 2] = b;
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
