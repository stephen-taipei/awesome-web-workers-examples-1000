self.onmessage = function(e) {
    const { imageData, progress, morphType } = e.data;
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
            const t = progress;

            switch (morphType) {
                case 'wave':
                    srcX = x + Math.sin(y / 15 + t * Math.PI * 4) * 20 * t;
                    srcY = y + Math.cos(x / 15 + t * Math.PI * 4) * 20 * t;
                    break;
                case 'sphere':
                    if (dist < maxRadius) {
                        const sphereFactor = Math.sin(Math.PI * dist / maxRadius / 2);
                        const newDist = dist * (1 - t * 0.5 * sphereFactor);
                        srcX = cx + Math.cos(angle) * newDist;
                        srcY = cy + Math.sin(angle) * newDist;
                    }
                    break;
                case 'twist':
                    const twistAngle = (1 - dist / maxRadius) * Math.PI * 2 * t;
                    srcX = cx + Math.cos(angle + twistAngle) * dist;
                    srcY = cy + Math.sin(angle + twistAngle) * dist;
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
