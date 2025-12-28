self.onmessage = function(e) {
    const { imageData, flareX, flareY, intensity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);
    const fx = width * flareX, fy = height * flareY;
    const cx = width / 2, cy = height / 2;

    // Create flare elements along the line from flare source through center
    const flares = [
        { pos: 0, size: 80, r: 255, g: 200, b: 100, alpha: 0.8 },
        { pos: 0.3, size: 30, r: 200, g: 150, b: 255, alpha: 0.4 },
        { pos: 0.5, size: 50, r: 100, g: 200, b: 255, alpha: 0.3 },
        { pos: 0.7, size: 20, r: 255, g: 255, b: 200, alpha: 0.5 },
        { pos: 1.2, size: 40, r: 200, g: 100, b: 255, alpha: 0.3 },
        { pos: 1.5, size: 60, r: 255, g: 150, b: 100, alpha: 0.2 }
    ];

    const dx = cx - fx, dy = cy - fy;

    for (const flare of flares) {
        const px = fx + dx * flare.pos;
        const py = fy + dy * flare.pos;
        addFlareCircle(output, width, height, px, py, flare.size * intensity, flare.r, flare.g, flare.b, flare.alpha * intensity);
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};

function addFlareCircle(data, width, height, cx, cy, radius, r, g, b, alpha) {
    const r2 = radius * radius;
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(height, Math.ceil(cy + radius)); y++) {
        for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(width, Math.ceil(cx + radius)); x++) {
            const dx = x - cx, dy = y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2) {
                const falloff = 1 - Math.sqrt(d2) / radius;
                const a = alpha * falloff * falloff;
                const idx = (y * width + x) * 4;
                data[idx] = Math.min(255, data[idx] + r * a);
                data[idx + 1] = Math.min(255, data[idx + 1] + g * a);
                data[idx + 2] = Math.min(255, data[idx + 2] + b * a);
            }
        }
    }
}
