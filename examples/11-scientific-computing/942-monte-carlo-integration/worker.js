// Monte Carlo Integration Worker

let func;
let isRunning = false;

self.onmessage = function(e) {
    const { command, func: funcStr, minX, maxX, maxY, delay } = e.data;

    if (command === 'start') {
        try {
            func = new Function('x', `with(Math) { return ${funcStr}; }`);
            isRunning = true;
            
            let total = 0;
            let under = 0;
            const areaBox = (maxX - minX) * maxY;
            
            const loop = () => {
                if (!isRunning) return;
                
                const batchSize = 1000;
                const points = new Float32Array(batchSize * 3);
                
                for (let i = 0; i < batchSize; i++) {
                    const rx = minX + Math.random() * (maxX - minX);
                    const ry = Math.random() * maxY;
                    
                    const fx = func(rx);
                    // Check if point is under curve (and above 0 for simplicity in this demo)
                    // Real MC handles negative areas by sign, here we assume positive area or absolute rejection area
                    // Standard Rejection: if y < f(x) then count.
                    
                    const isUnder = ry <= fx && fx >= 0; 
                    // Handling negative functions? 
                    // For simplicity, let's assume f(x) >= 0 or visual is just area under positive part
                    // or area between axis.
                    // If we want net signed area: if ry < abs(fx) ... check sign.
                    // Demo: simple area under positive curve.
                    
                    if (isUnder) under++;
                    
                    points[i*3] = rx;
                    points[i*3+1] = ry;
                    points[i*3+2] = isUnder ? 1 : 0;
                }
                
                total += batchSize;
                const integral = (under / total) * areaBox;
                
                self.postMessage({
                    type: 'batch',
                    data: {
                        total,
                        integral,
                        points // Transfer?
                    }
                }, [points.buffer]);
                
                setTimeout(loop, delay);
            };
            
            loop();
            
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
};
