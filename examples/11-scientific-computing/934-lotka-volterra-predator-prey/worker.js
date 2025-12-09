// Lotka-Volterra Simulation

let t = 0;
let prey = 10;
let pred = 10;
let alpha = 0.6; // Prey growth
let beta = 1.3;  // Predation rate
let delta = 1.0; // Predator growth
let gamma = 1.0; // Predator death
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        // Init params
        alpha = e.data.alpha;
        beta = e.data.beta;
        delta = e.data.delta;
        gamma = e.data.gamma;
        
        t = 0;
        prey = 10;
        pred = 10;
        isRunning = true;
        loop();
    }
    else if (command === 'params') {
        alpha = e.data.alpha;
        beta = e.data.beta;
        delta = e.data.delta;
        gamma = e.data.gamma;
    }
};

function loop() {
    if (!isRunning) return;

    const dt = 0.05; // Time step
    
    // Euler Integration (Simple)
    // dx/dt = alpha*x - beta*x*y
    // dy/dt = delta*x*y - gamma*y
    
    const dPrey = (alpha * prey - beta * prey * pred) * dt;
    const dPred = (delta * prey * pred - gamma * pred) * dt;
    
    prey += dPrey;
    pred += dPred;
    t += dt;
    
    // Prevent negative populations
    if (prey < 0) prey = 0;
    if (pred < 0) pred = 0;

    self.postMessage({
        type: 'step',
        data: { t, prey, pred }
    });

    setTimeout(loop, 30); // Animation speed
}
