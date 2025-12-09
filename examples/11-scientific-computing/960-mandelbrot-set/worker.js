self.onmessage = function(e) {
    const { command, width, height, centerX, centerY, scale, maxIter, scheme } = e.data;

    if (command === 'render') {
        const start = performance.now();
        
        const buffer = new ArrayBuffer(width * height * 4);
        const data = new Uint32Array(buffer); // Use Uint32 for faster pixel writing
        
        // Complex plane boundaries
        const aspectRatio = width / height;
        const scaleY = scale / aspectRatio;
        
        const minX = centerX - scale / 2;
        const minY = centerY - scaleY / 2;
        
        // Palette generation
        const palette = generatePalette(maxIter, scheme);

        for (let y = 0; y < height; y++) {
            const c_im = minY + (y / height) * scaleY;
            
            for (let x = 0; x < width; x++) {
                const c_re = minX + (x / width) * scale;
                
                // Mandelbrot Iteration
                // z = z^2 + c
                let z_re = 0;
                let z_im = 0;
                let iter = 0;
                
                while (z_re*z_re + z_im*z_im <= 4 && iter < maxIter) {
                    const next_re = z_re*z_re - z_im*z_im + c_re;
                    const next_im = 2*z_re*z_im + c_im;
                    z_re = next_re;
                    z_im = next_im;
                    iter++;
                }
                
                // Color mapping
                // data[y * width + x] = 0xFF0000FF; // Little-endian: A B G R (Full Alpha Blue)
                // ABGR
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
            palette[i] = 0xFF000000; // Black (Inside) -> ABGR: FF 00 00 00
            continue;
        }
        
        let r, g, b;
        const t = i / maxIter;
        
        if (scheme === 'classic') {
            const c = (i % 2) * 255;
            r = g = b = c;
        } else if (scheme === 'fire') {
            r = Math.min(255, i * 8);
            g = Math.min(255, i * 4);
            b = Math.min(255, i * 2);
        } else if (scheme === 'ice') {
            r = Math.min(255, i * 2);
            g = Math.min(255, i * 4);
            b = Math.min(255, i * 12 + 50);
        } else { // Rainbow
            // HSL to RGB logic simplified
            const hue = (i * 5) % 360;
            [r, g, b] = hsvToRgb(hue, 1, 1);
        }
        
        // ABGR format for Uint32
        palette[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
    return palette;
}

function hsvToRgb(h, s, v) {
    let c = v * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = v - c;
    let r, g, b;
    if (h < 60) { r=c; g=x; b=0; }
    else if (h < 120) { r=x; g=c; b=0; }
    else if (h < 180) { r=0; g=c; b=x; }
    else if (h < 240) { r=0; g=x; b=c; }
    else if (h < 300) { r=x; g=0; b=c; }
    else { r=c; g=0; b=x; }
    return [Math.floor((r+m)*255), Math.floor((g+m)*255), Math.floor((b+m)*255)];
}
