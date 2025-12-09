// Lorenz Attractor Solver

let x = 0.1, y = 0, z = 0;
let sigma = 10;
let rho = 28;
let beta = 2.6666;
let dt = 0.01;
let stepsPerFrame = 10;
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        isRunning = true;
        loop();
    } else if (command === 'update') {
        if (e.data.sigma) sigma = e.data.sigma;
        if (e.data.rho) rho = e.data.rho;
        if (e.data.beta) beta = e.data.beta;
        if (e.data.stepsPerFrame) stepsPerFrame = e.data.stepsPerFrame;
    }
};

function loop() {
    if (!isRunning) return;

    const batch = [];
    
    for (let i = 0; i < stepsPerFrame; i++) {
        // RK4 Integration (Runge-Kutta 4th Order) for better stability than Euler
        // dx/dt = sigma * (y - x)
        // dy/dt = x * (rho - z) - y
        // dz/dt = x * y - beta * z
        
        const k1 = derivatives(x, y, z);
        const k2 = derivatives(x + k1.dx * dt * 0.5, y + k1.dy * dt * 0.5, z + k1.dz * dt * 0.5);
        const k3 = derivatives(x + k2.dx * dt * 0.5, y + k2.dy * dt * 0.5, z + k2.dz * dt * 0.5);
        const k4 = derivatives(x + k3.dx * dt, y + k3.dy * dt, z + k3.dz * dt);
        
        x += (k1.dx + 2*k2.dx + 2*k3.dx + k4.dx) * (dt / 6);
        y += (k1.dy + 2*k2.dy + 2*k3.dy + k4.dy) * (dt / 6);
        z += (k1.dz + 2*k2.dz + 2*k3.dz + k4.dz) * (dt / 6);
        
        batch.push({x, y, z});
    }
    
    self.postMessage({ type: 'points', data: batch });
    
    // Request next frame
    setTimeout(loop, 16); // ~60fps target
}

function derivatives(x, y, z) {
    return {
        dx: sigma * (y - x),
        dy: x * (rho - z) - y,
        dz: x * y - beta * z
    };
}
