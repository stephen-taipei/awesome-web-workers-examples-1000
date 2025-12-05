// Julia Set Worker

self.onmessage = function(e) {
    const { command, width, height, cRe, cIm, maxIter, scheme } = e.data;

    if (command === 'render') {
        const start = performance.now();
        
        const buffer = new ArrayBuffer(width * height * 4);
        const data = new Uint32Array(buffer);
        
        const scale = 3.0;
        const minX = -scale / 2;
        const minY = -scale / 2;
        
        // Palette generation
        const palette = generatePalette(maxIter, scheme);

        for (let y = 0; y < height; y++) {
            const z_im_start = minY + (y / height) * scale;
            
            for (let x = 0; x < width; x++) {
                const z_re_start = minX + (x / width) * scale;
                
                // Z = z^2 + c
                let zr = z_re_start;
                let zi = z_im_start;
                let iter = 0;
                
                while (zr*zr + zi*zi <= 4 && iter < maxIter) {
                    const tr = zr*zr - zi*zi + cRe;
                    const ti = 2*zr*zi + cIm;
                    zr = tr;
                    zi = ti;
                    iter++;
                }
                
                // Pixel Color
                data[y * width + x] = palette[iter];
            }
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                buffer,
                duration: (end - start).toFixed(2)
            }
        }, [buffer]);
    }
};

function generatePalette(maxIter, scheme) {
    const palette = new Uint32Array(maxIter + 1);
    
    for (let i = 0; i <= maxIter; i++) {
        if (i === maxIter) {
            palette[i] = 0xFF000000; // Black
            continue;
        }
        
        let r, g, b;
        const t = i / maxIter;
        
        if (scheme === 'grayscale') {
            const v = Math.floor(Math.sqrt(t) * 255);
            r=g=b=v;
        } else if (scheme === 'heatmap') {
            r = Math.min(255, i * 5);
            g = Math.max(0, 255 - i * 5);
            b = 0;
        } else { // Electric
            // HSL approx
            r = Math.floor(128 + 127 * Math.sin(i * 0.1));
            g = Math.floor(128 + 127 * Math.sin(i * 0.1 + 2));
            b = Math.floor(128 + 127 * Math.sin(i * 0.1 + 4));
        }
        
        // ABGR
        palette[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
    return palette;
}
