// Bessel Function Worker

// Bessel Zeros (Approximated for first few modes)
// J_m(x) = 0
const BESSEL_ZEROS = [
    [2.4048, 5.5201, 8.6537, 11.7915, 14.9309], // m=0
    [3.8317, 7.0156, 10.1735, 13.3237, 16.4706], // m=1
    [5.1356, 8.4172, 11.6198, 14.7960, 17.9598], // m=2
    [6.3802, 9.7610, 13.0152, 16.2235, 19.4094], // m=3
    [7.5883, 11.0647, 14.3725, 17.6160, 20.8269], // m=4
    [8.7715, 12.3386, 15.7002, 18.9801, 22.2178]  // m=5
];

let buffer;
let width, height;
let m = 0, n = 1;
let speed = 10;
let time = 0;
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        width = e.data.width;
        height = e.data.height;
        m = e.data.m;
        n = e.data.n;
        speed = e.data.speed;
        
        buffer = new Uint8ClampedArray(width * height * 4);
        
        isRunning = true;
        loop();
    } 
    else if (command === 'params') {
        m = e.data.m;
        n = e.data.n;
        speed = e.data.speed;
    }
    else if (command === 'next') {
        buffer = new Uint8ClampedArray(e.data.buffer);
        loop();
    }
};

function loop() {
    if (!isRunning) return;

    time += speed * 0.01;
    
    // Vibration Mode (m, n)
    // z(r, theta, t) = J_m(k_mn * r) * cos(m * theta) * cos(omega * t)
    // omega is proportional to k_mn (wave speed c=1)
    
    // Get zero k_mn
    // n is 1-based index
    const zeroIdx = Math.min(Math.max(0, n - 1), 4);
    const modeMIdx = Math.min(Math.max(0, m), 5);
    const k = BESSEL_ZEROS[modeMIdx][zeroIdx];
    const omega = k; // Speed c=1
    
    const cosT = Math.cos(omega * time);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxR = width / 2;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const r = Math.sqrt(dx*dx + dy*dy) / maxR;
            
            const idx = (y * width + x) * 4;
            
            if (r > 1) {
                buffer[idx+3] = 0; // Transparent outside circle
                continue;
            }
            
            const theta = Math.atan2(dy, dx);
            
            // Compute Bessel J_m(k*r)
            const jVal = besselJ(m, k * r);
            
            // Height
            const z = jVal * Math.cos(m * theta) * cosT;
            
            // Color mapping: Blue (-) -> Black (0) -> Red (+)
            // Z range approx -1 to 1 (Bessel max is < 1 except m=0 at r=0)
            // Scale for visibility
            
            const val = z * 255; // Scale up
            
            if (val > 0) {
                buffer[idx] = Math.min(255, val * 2); // R
                buffer[idx+1] = Math.min(255, val * 0.5); // G
                buffer[idx+2] = Math.min(255, val * 0.5); // B
            } else {
                buffer[idx] = Math.min(255, -val * 0.5);
                buffer[idx+1] = Math.min(255, -val * 0.5);
                buffer[idx+2] = Math.min(255, -val * 2); // B
            }
            buffer[idx+3] = 255; // Alpha
        }
    }

    self.postMessage({
        type: 'frame',
        data: { buffer: buffer.buffer }
    }, [buffer.buffer]);
}

// Recursive Bessel implementation or Series?
// For small x, Series. For large x, Asymptotic. 
// For this demo (x < 25), Series is fine but slow.
// We use a simplified approximation or numerical integration.
// Or simpler: Recurrence relation J_{n+1} = 2n/x J_n - J_{n-1}
// Start J0, J1.

function besselJ(n, x) {
    if (x === 0) return n === 0 ? 1 : 0;
    
    // Using library-free approximation is hard.
    // Let's use the integral definition for J_n(x)
    // J_n(x) = (1/PI) * Integral(0 to PI) cos(n*t - x*sin(t)) dt
    // Numerical integration (Simpson's rule or trapezoid)
    
    const steps = 20; // Reduced for realtime performance
    const dt = Math.PI / steps;
    let sum = 0;
    
    for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        const val = Math.cos(n * t - x * Math.sin(t));
        if (i === 0 || i === steps) sum += val;
        else sum += 2 * val;
    }
    
    return (1 / Math.PI) * sum * (dt / 2);
}
