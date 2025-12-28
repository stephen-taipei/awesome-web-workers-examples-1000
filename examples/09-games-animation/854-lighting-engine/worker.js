/**
 * Lighting Engine - Web Worker
 */
self.onmessage = function(e) {
    if (e.data.type === 'RENDER') {
        const { lights, width, height } = e.data.payload;
        const pixels = new Uint8Array(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 20, g = 20, b = 30;

                for (const light of lights) {
                    const dx = x - light.x;
                    const dy = y - light.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < light.radius) {
                        const factor = (1 - dist / light.radius) * light.intensity;
                        r += light.r * factor;
                        g += light.g * factor;
                        b += light.b * factor;
                    }
                }

                const idx = (y * width + x) * 4;
                pixels[idx] = Math.min(255, r);
                pixels[idx+1] = Math.min(255, g);
                pixels[idx+2] = Math.min(255, b);
                pixels[idx+3] = 255;
            }
        }

        self.postMessage({ type: 'FRAME', payload: { pixels: pixels.buffer } }, [pixels.buffer]);
    }
};
