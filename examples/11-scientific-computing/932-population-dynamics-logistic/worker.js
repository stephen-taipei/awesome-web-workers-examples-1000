// Logistic Map Bifurcation Worker

self.onmessage = function(e) {
    const { command, rMin, rMax, width, height } = e.data;

    if (command === 'render') {
        const start = performance.now();
        
        // Create buffer
        const buffer = new ArrayBuffer(width * height * 4);
        const data = new Uint32Array(buffer); // ABGR view for speed
        
        // Fill black (alpha=255)
        data.fill(0xFF000000); 
        
        // Iterate r values (X axis)
        for (let x = 0; x < width; x++) {
            const r = rMin + (x / width) * (rMax - rMin);
            
            // Logistic Map: x_{n+1} = r * x_n * (1 - x_n)
            let pop = 0.5;
            
            // Stabilize (ignore first N iterations)
            for (let i = 0; i < 1000; i++) {
                pop = r * pop * (1 - pop);
            }
            
            // Collect points (next M iterations)
            // We plot these.
            for (let i = 0; i < 500; i++) {
                pop = r * pop * (1 - pop);
                
                // Map pop (0 to 1) to Y (height-1 to 0)
                // Y grows down in canvas
                const y = Math.floor((1 - pop) * height);
                
                if (y >= 0 && y < height) {
                    // Plot white dot
                    // Simple plot - overwrite
                    // data[y * width + x] = 0xFFFFFFFF;
                    
                    // Or better: Accumulate density (alpha blending)? 
                    // With Uint32Array, setting distinct value is fastest.
                    // Let's use Purple/Pink for style
                    // ABGR: FF D8 93 CE (Approx color)
                    
                    data[y * width + x] = 0xFFD893CE;
                }
            }
        }
        
        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                buffer,
                width, height,
                duration: (end - start).toFixed(2)
            }
        }, [buffer]);
    }
};
