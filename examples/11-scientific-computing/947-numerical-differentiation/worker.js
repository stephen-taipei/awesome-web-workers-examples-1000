// Numerical Differentiation Worker

self.onmessage = function(e) {
    const { command, func, method, h, rangeStart, rangeEnd, steps } = e.data;

    if (command === 'compute') {
        const start = performance.now();

        const f = getFunction(func);
        const stepSize = (rangeEnd - rangeStart) / steps;
        
        const xArr = new Float32Array(steps + 1);
        const yArr = new Float32Array(steps + 1);
        const dyArr = new Float32Array(steps + 1); // Derivative

        for (let i = 0; i <= steps; i++) {
            const x = rangeStart + i * stepSize;
            xArr[i] = x;
            yArr[i] = f(x);
            
            // Compute Derivative
            let dy = 0;
            
            if (method === 'forward') {
                // f'(x) = (f(x+h) - f(x)) / h
                dy = (f(x + h) - f(x)) / h;
            } 
            else if (method === 'backward') {
                // f'(x) = (f(x) - f(x-h)) / h
                dy = (f(x) - f(x - h)) / h;
            } 
            else { // Central
                // f'(x) = (f(x+h) - f(x-h)) / (2h)
                // Error O(h^2) vs O(h) for others
                dy = (f(x + h) - f(x - h)) / (2 * h);
            }
            
            dyArr[i] = dy;
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                x: xArr,
                y: yArr,
                dy: dyArr,
                duration: (end - start).toFixed(2)
            }
        });
    }
};

function getFunction(type) {
    switch(type) {
        case 'sin': return Math.sin;
        case 'poly': return x => x*x*x - 2*x*x + x;
        case 'exp': return x => Math.exp(-x*x); // Gaussian
        case 'tanh': return Math.tanh;
        default: return x => x;
    }
}
