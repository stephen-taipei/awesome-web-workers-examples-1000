// Mandelbrot Zoom Video Generator

self.onmessage = function(e) {
    const { command, config } = e.data;

    if (command === 'renderSequence') {
        const start = performance.now();
        
        const { width, height, frames, totalZoom, targetX, targetY } = config;
        
        // Initial View
        const startScale = 3.0;
        const endScale = startScale / totalZoom;
        
        // Calculate zoom step (Logarithmic interpolation)
        // scale = start * (factor ^ t)
        // end = start * (factor ^ frames) => factor = (end/start)^(1/frames)
        const zoomFactor = Math.pow(endScale / startScale, 1 / (frames - 1));
        
        // We process frames sequentially or interleaved?
        // JS is single threaded in worker. Just loop.
        
        let currentScale = startScale;
        
        for (let i = 0; i < frames; i++) {
            const buffer = renderFrame(width, height, targetX, targetY, currentScale);
            
            // Send frame back
            self.postMessage({
                type: 'frame',
                data: {
                    index: i,
                    buffer
                }
            }, [buffer]); // Transfer
            
            currentScale *= zoomFactor;
        }
        
        const end = performance.now();
        self.postMessage({
            type: 'done',
            data: { duration: (end - start).toFixed(2) }
        });
    }
};

function renderFrame(w, h, cx, cy, scale) {
    const buffer = new ArrayBuffer(w * h * 4);
    const data = new Uint32Array(buffer);
    
    const aspectRatio = w / h;
    const scaleY = scale / aspectRatio;
    const minX = cx - scale / 2;
    const minY = cy - scaleY / 2;
    
    // Max iter increases with zoom to keep detail
    const maxIter = Math.floor(100 + 20 * Math.log2(3.0/scale)); 
    
    for (let y = 0; y < h; y++) {
        const c_im = minY + (y / h) * scaleY;
        for (let x = 0; x < w; x++) {
            const c_re = minX + (x / w) * scale;
            
            let zr = 0, zi = 0;
            let iter = 0;
            
            // Optimization: cardioid check could go here
            
            while (zr*zr + zi*zi <= 4 && iter < maxIter) {
                const tr = zr*zr - zi*zi + c_re;
                zi = 2*zr*zi + c_im;
                zr = tr;
                iter++;
            }
            
            // Color
            data[y*w + x] = colorMap(iter, maxIter);
        }
    }
    return buffer;
}

function colorMap(iter, max) {
    if (iter === max) return 0xFF000000; // Black
    
    // Smooth coloring could be better, but simple iteration count for now
    const t = iter / max;
    
    // HSL Rainbow
    // Hue: 0-360 based on iter
    // ABGR
    
    // Fast approximate HSL->RGB
    const h = (iter * 10) % 360;
    // S=1, L=0.5
    
    // Simple pre-calc or func
    // Let's do a simple cyclic purple palette
    const v = Math.floor(255 * t);
    // R G B A
    // 0xAABBGGRR
    
    // Cycle hues
    const r = Math.floor(128 + 127 * Math.sin(iter * 0.1));
    const g = Math.floor(128 + 127 * Math.sin(iter * 0.1 + 2));
    const b = Math.floor(128 + 127 * Math.sin(iter * 0.1 + 4));
    
    return (255 << 24) | (b << 16) | (g << 8) | r;
}
