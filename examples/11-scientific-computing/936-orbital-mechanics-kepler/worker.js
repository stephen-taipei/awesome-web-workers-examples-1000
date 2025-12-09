// Kepler Orbit Solver

let M = 0; // Mean Anomaly
let e = 0.5; // Eccentricity
let a = 150; // Semi-major axis
let speed = 5;
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        e.data.e !== undefined && (e = e.data.e);
        e.data.a !== undefined && (a = e.data.a);
        e.data.speed !== undefined && (speed = e.data.speed);
        
        // Reset values
        updateGlobals(e.data);
        
        isRunning = true;
        loop();
    } 
    else if (command === 'params') {
        updateGlobals(e.data);
    }
};

function updateGlobals(data) {
    if (data.e !== undefined) e = data.e;
    if (data.a !== undefined) a = data.a;
    if (data.speed !== undefined) speed = data.speed;
}

function loop() {
    if (!isRunning) return;

    // Time step
    // M = n * t (Mean Anomaly increases linearly with time)
    // n = sqrt(mu / a^3)
    // For sim, just increment M directly based on speed
    const deltaM = speed * 0.01; 
    M += deltaM;
    if (M > 2 * Math.PI) M -= 2 * Math.PI;

    // Solve Kepler's Equation: M = E - e * sin(E) for E (Eccentric Anomaly)
    // Using Newton-Raphson iteration
    let E = M; // Initial guess
    for (let i = 0; i < 10; i++) {
        const f = E - e * Math.sin(E) - M;
        const df = 1 - e * Math.cos(E);
        E = E - f / df;
    }

    // Calculate True Anomaly (v)
    // tan(v/2) = sqrt((1+e)/(1-e)) * tan(E/2)
    const sqrtTerm = Math.sqrt((1 + e) / (1 - e));
    const tanV2 = sqrtTerm * Math.tan(E / 2);
    const v = 2 * Math.atan(tanV2);

    // Calculate Radius (r)
    // r = a * (1 - e * cos(E))
    const r = a * (1 - e * Math.cos(E));

    self.postMessage({
        type: 'update',
        data: {
            M,
            E,
            v, // True Anomaly
            r
        }
    });

    setTimeout(loop, 16);
}
