// ODE Solver Worker

self.onmessage = function(e) {
    const { command, system, params, init, duration, dt } = e.data;

    if (command === 'solve') {
        try {
            const start = performance.now();
            
            // Select Derivative Function
            let derivFunc;
            if (system === 'lotka') derivFunc = lotkaVolterra(params);
            else if (system === 'harmonic') derivFunc = harmonicOscillator(params);
            else if (system === 'vanDerPol') derivFunc = vanDerPol(params);
            else throw new Error("Unknown system");

            // Solve using RK4
            const points = rungeKutta4(derivFunc, 0, init, dt, duration);

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    points,
                    duration: (end - start).toFixed(2)
                }
            });

        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};

// RK4 Solver
// f(t, y) returns dy/dt array
function rungeKutta4(f, t0, y0, dt, duration) {
    const steps = Math.ceil(duration / dt);
    const points = new Array(steps + 1);
    
    let t = t0;
    let y = [...y0]; // Clone
    const dim = y.length;
    
    points[0] = { t, y: [...y] };
    
    for (let i = 1; i <= steps; i++) {
        const k1 = f(t, y);
        
        const y_k1 = new Array(dim);
        for(let j=0; j<dim; j++) y_k1[j] = y[j] + k1[j] * dt * 0.5;
        const k2 = f(t + dt * 0.5, y_k1);
        
        const y_k2 = new Array(dim);
        for(let j=0; j<dim; j++) y_k2[j] = y[j] + k2[j] * dt * 0.5;
        const k3 = f(t + dt * 0.5, y_k2);
        
        const y_k3 = new Array(dim);
        for(let j=0; j<dim; j++) y_k3[j] = y[j] + k3[j] * dt;
        const k4 = f(t + dt, y_k3);
        
        // Update
        for(let j=0; j<dim; j++) {
            y[j] += (dt / 6) * (k1[j] + 2*k2[j] + 2*k3[j] + k4[j]);
        }
        t += dt;
        
        // Optimize: Don't store every single point if steps is huge?
        // For < 100k points, it's fine.
        points[i] = { t, y: [...y] };
    }
    
    return points;
}

// System Definitions (return function (t, y) => dy)

function lotkaVolterra({ alpha, beta, delta, gamma }) {
    return (t, y) => {
        const prey = y[0];
        const pred = y[1];
        // dx/dt = alpha*x - beta*x*y
        // dy/dt = delta*x*y - gamma*y
        return [
            alpha * prey - beta * prey * pred,
            delta * prey * pred - gamma * pred
        ];
    };
}

function harmonicOscillator({ k, c, m }) {
    return (t, y) => {
        const x = y[0];
        const v = y[1];
        // dx/dt = v
        // dv/dt = (-k*x - c*v) / m
        return [
            v,
            (-k * x - c * v) / m
        ];
    };
}

function vanDerPol({ mu }) {
    return (t, y) => {
        const x = y[0];
        const v = y[1];
        // dx/dt = v
        // dv/dt = mu * (1 - x^2) * v - x
        return [
            v,
            mu * (1 - x * x) * v - x
        ];
    };
}
