// Vector Field Simulation Worker

let particles; // Float32Array [x, y, x, y...]
let funcU, funcV;
let rangeX = 5;
let rangeY = 5;
let isRunning = false;

self.onmessage = function(e) {
    const { command, eqU, eqV, count, dt, width, height } = e.data;

    if (command === 'start') {
        try {
            funcU = createMathFunction(eqU);
            funcV = createMathFunction(eqV);
            
            // Initialize particles
            particles = new Float32Array(count * 2);
            for(let i=0; i<count; i++) {
                particles[i*2] = (Math.random() - 0.5) * width; // -5 to 5
                particles[i*2+1] = (Math.random() - 0.5) * height;
            }
            
            isRunning = true;
            loop(dt, width, height);
            
        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};

function loop(dt, w, h) {
    if (!isRunning) return;

    const count = particles.length / 2;
    const halfW = w/2;
    const halfH = h/2;

    for (let i = 0; i < count; i++) {
        let x = particles[i*2];
        let y = particles[i*2+1];
        
        // RK2 Integration (Heun's Method) for better curve following than Euler
        // k1 = f(x, y)
        // k2 = f(x + dt*k1x, y + dt*k1y)
        // pos += dt/2 * (k1 + k2)
        
        const u1 = funcU(x, y);
        const v1 = funcV(x, y);
        
        const x2 = x + u1 * dt;
        const y2 = y + v1 * dt;
        
        const u2 = funcU(x2, y2);
        const v2 = funcV(x2, y2);
        
        x += (dt / 2) * (u1 + u2);
        y += (dt / 2) * (v1 + v2);
        
        // Boundary Wrap-around
        if (x > halfW) x = -halfW;
        else if (x < -halfW) x = halfW;
        
        if (y > halfH) y = -halfH;
        else if (y < -halfH) y = halfH;
        
        // Simple Euler fallback if RK2 is unstable (NaN check)
        if (!isFinite(x) || !isFinite(y)) {
            // Reset particle randomly
            x = (Math.random() - 0.5) * w;
            y = (Math.random() - 0.5) * h;
        }

        particles[i*2] = x;
        particles[i*2+1] = y;
    }

    self.postMessage({
        type: 'update',
        data: { particles }
    });

    setTimeout(() => loop(dt, w, h), 16);
}

function createMathFunction(expression) {
    const args = ['x', 'y'];
    // Whitelist logic or just allow standard math
    const body = `with (Math) { return (${expression}); }`;
    return new Function(...args, body);
}
