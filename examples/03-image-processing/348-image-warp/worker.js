self.onmessage = function(e) {
    const { imageData, warpType, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const cx = width / 2, cy = height / 2;
    const maxRadius = Math.min(cx, cy);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let srcX = x, srcY = y;
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            switch (warpType) {
                case 'wave':
                    srcX = x + Math.sin(y / 10) * strength * 20;
                    srcY = y + Math.sin(x / 10) * strength * 20;
                    break;
                case 'swirl':
                    const swirlAngle = dist / maxRadius * Math.PI * 2 * strength;
                    srcX = cx + Math.cos(angle + swirlAngle) * dist;
                    srcY = cy + Math.sin(angle + swirlAngle) * dist;
                    break;
                case 'bulge':
                    if (dist < maxRadius) {
                        const factor = Math.pow(dist / maxRadius, 1 + strength);
                        srcX = cx + dx * factor;
                        srcY = cy + dy * factor;
                    }
                    break;
                case 'pinch':
                    if (dist < maxRadius) {
                        const factor = Math.pow(dist / maxRadius, 1 / (1 + strength));
                        srcX = cx + dx * factor;
                        srcY = cy + dy * factor;
                    }
                    break;
            }

            srcX = Math.max(0, Math.min(width - 1, Math.round(srcX)));
            srcY = Math.max(0, Math.min(height - 1, Math.round(srcY)));

            const dstIdx = (y * width + x) * 4;
            const srcIdx = (srcY * width + srcX) * 4;

            output[dstIdx] = data[srcIdx];
            output[dstIdx + 1] = data[srcIdx + 1];
            output[dstIdx + 2] = data[srcIdx + 2];
            output[dstIdx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
