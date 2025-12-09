// Option Pricing Worker

self.onmessage = function(e) {
    const { command, params } = e.data;

    if (command === 'calculate') {
        try {
            const start = performance.now();
            
            // 1. Analytical Black-Scholes
            const bsResults = blackScholes(params.S, params.K, params.T, params.r, params.sigma);
            
            // 2. Monte Carlo Simulation
            const mcResults = monteCarlo(params.S, params.K, params.T, params.r, params.sigma, params.sims);
            
            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    bs: bsResults,
                    mc: mcResults,
                    paths: mcResults.paths, // Subset for visualization
                    duration: (end - start).toFixed(2)
                }
            });
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
};

// Standard Normal CDF
function cdf(x) {
    return (1.0 + erf(x / Math.sqrt(2.0))) / 2.0;
}

// Error Function Approximation
function erf(x) {
    // Constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

// Standard Normal PDF
function pdf(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function blackScholes(S, K, T, r, sigma) {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    
    const call = S * cdf(d1) - K * Math.exp(-r * T) * cdf(d2);
    const put = K * Math.exp(-r * T) * cdf(-d2) - S * cdf(-d1);
    
    // Greeks (Call)
    const delta = cdf(d1);
    const gamma = pdf(d1) / (S * sigma * Math.sqrt(T));
    const vega = S * pdf(d1) * Math.sqrt(T) / 100; // scaled for % change usually
    const theta = (- (S * pdf(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * cdf(d2)) / 365; // Daily theta
    
    return { call, put, delta, gamma, vega, theta };
}

function monteCarlo(S, K, T, r, sigma, sims) {
    let sumPayoffCall = 0;
    let sumPayoffPut = 0;
    let sumSqPayoffCall = 0; // For variance/stdErr
    
    const pathsToReturn = []; // Store first 50 paths
    const steps = 100; // Steps per path for visualization
    const dt = T / steps;
    
    // Geometric Brownian Motion
    // S_t = S_0 * exp((r - 0.5*sigma^2)*t + sigma*sqrt(t)*Z)
    
    const drift = (r - 0.5 * sigma * sigma) * dt;
    const vol = sigma * Math.sqrt(dt);
    
    for (let i = 0; i < sims; i++) {
        let currentS = S;
        const path = (i < 50) ? [S] : null;
        
        for (let j = 0; j < steps; j++) {
            // Box-Muller for Z
            const u1 = Math.random();
            const u2 = Math.random();
            const Z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            
            currentS = currentS * Math.exp(drift + vol * Z);
            
            if (path) path.push(currentS);
        }
        
        if (path) pathsToReturn.push(path);
        
        // Payoff at maturity
        const valCall = Math.max(0, currentS - K);
        const valPut = Math.max(0, K - currentS);
        
        sumPayoffCall += valCall;
        sumSqPayoffCall += valCall * valCall;
        sumPayoffPut += valPut;
    }
    
    const meanCall = sumPayoffCall / sims;
    const meanPut = sumPayoffPut / sims;
    
    // Discount back to present value
    const disc = Math.exp(-r * T);
    const callPrice = meanCall * disc;
    const putPrice = meanPut * disc;
    
    // Std Error
    const varCall = (sumSqPayoffCall / sims - meanCall * meanCall);
    const stdErr = (Math.sqrt(varCall) / Math.sqrt(sims)) * disc;
    
    return { call: callPrice, put: putPrice, stdErr, paths: pathsToReturn };
}
