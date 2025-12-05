// SIR Model Worker

self.onmessage = function(e) {
    const { command, N, beta, gamma, days } = e.data;

    if (command === 'simulate') {
        const start = performance.now();
        
        // Initial State
        let S = N - 1; // 1 Infected patient zero
        let I = 1;
        let R = 0;
        
        const history = [{s: S, i: I, r: R}];
        const dt = 0.1; // Time step (hours fraction)
        const steps = days / dt;
        
        let peakI = 0;
        
        for (let t = 0; t < steps; t++) {
            // dS/dt = -beta * S * I / N
            // dI/dt = beta * S * I / N - gamma * I
            // dR/dt = gamma * I
            
            const dS = -beta * S * I / N;
            const dR = gamma * I;
            const dI = -dS - dR; // Conservation check, actually (beta*S*I/N - gamma*I)
            
            S += dS * dt;
            I += dI * dt;
            R += dR * dt;
            
            if (I > peakI) peakI = I;
            
            // Record daily (approx every 1/dt steps)
            if (t % Math.round(1/dt) === 0) {
                history.push({s: S, i: I, r: R});
            }
        }
        
        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                history,
                peakI,
                finalR: R,
                duration: (end - start).toFixed(2)
            }
        });
    }
};
