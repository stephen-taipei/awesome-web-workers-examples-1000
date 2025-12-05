// Geometric Brownian Motion Simulator

self.onmessage = function(e) {
    const { command, params } = e.data;

    if (command === 'simulate') {
        try {
            const { S0, mu, sigma, T, paths } = params;
            const start = performance.now();
            
            // Simulation parameters
            const steps = 252 * T; // Approx trading days
            const dt = 1 / 252; // 1 day
            
            const allPaths = [];
            const finalPrices = [];
            
            // Pre-calculate constants
            const drift = (mu - 0.5 * sigma * sigma) * dt;
            const vol = sigma * Math.sqrt(dt);
            
            for (let i = 0; i < paths; i++) {
                const path = new Float32Array(Math.ceil(steps) + 1);
                path[0] = S0;
                
                let currentS = S0;
                
                for (let j = 1; j <= steps; j++) {
                    // Box-Muller for Z
                    const u1 = Math.random();
                    const u2 = Math.random();
                    const Z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                    
                    // S_t = S_{t-1} * exp(...)
                    currentS = currentS * Math.exp(drift + vol * Z);
                    path[j] = currentS;
                }
                
                allPaths.push(path); // Usually transfer but array of arrays ok for view
                finalPrices.push(currentS);
            }
            
            // Calculate Statistics
            const sum = finalPrices.reduce((a, b) => a + b, 0);
            const mean = sum / paths;
            
            finalPrices.sort((a, b) => a - b);
            const median = finalPrices[Math.floor(paths / 2)];
            
            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    paths: allPaths, // Send all for drawing
                    mean,
                    median,
                    timeSteps: steps,
                    duration: (end - start).toFixed(2)
                }
            });
            
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
};
