// Special Functions Worker

self.onmessage = function(e) {
    const { command, type, start, end, step, paramY } = e.data;

    if (command === 'compute') {
        try {
            const timeStart = performance.now();
            const points = [];

            // Loop with floating point safety
            // Using integer iteration to avoid accumulation error
            const count = Math.ceil((end - start) / step);
            
            for (let i = 0; i <= count; i++) {
                const x = start + i * step;
                let y;

                if (type === 'gamma') {
                    y = gamma(x);
                } else if (type === 'beta') {
                    y = beta(x, paramY);
                } else if (type === 'erf') {
                    y = erf(x);
                }

                points.push({ x, y });
            }

            const timeEnd = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    points,
                    duration: (timeEnd - timeStart).toFixed(2)
                }
            });

        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};

// Lanczos Approximation for Gamma Function
// Approximation for (z+g-0.5)^(z-0.5) * exp(-(z+g-0.5)) * sqrt(2*PI) * [ Ag(z) ]
function gamma(z) {
    if (z < 0.5) {
        // Reflection formula: Gamma(z) = PI / (sin(PI*z) * Gamma(1-z))
        return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    }
    
    // Coefficients for g=7
    const p = [
        0.99999999999980993, 
        676.5203681218851, 
        -1259.1392167224028, 
        771.32342877765313, 
        -176.61502916214059, 
        12.507343278686905, 
        -0.13857109526572012, 
        9.9843695780195716e-6, 
        1.5056327351493116e-7
    ];
    
    const g = 7;
    z -= 1;
    
    let x = p[0];
    for (let i = 1; i < g + 2; i++) {
        x += p[i] / (z + i);
    }
    
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// Beta Function B(x, y) = Gamma(x)Gamma(y) / Gamma(x+y)
function beta(x, y) {
    return (gamma(x) * gamma(y)) / gamma(x + y);
}

// Error Function erf(x)
// Approximation using Abramowitz and Stegun 7.1.26
function erf(x) {
    // erf(-x) = -erf(x)
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // Constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}
