// Stable Fluids Worker

let N;
let size;
let dt = 0.1;
let diff = 0.0001;
let visc = 0.0001;
let iter = 16;

// Arrays (1D flattened)
let u, v, u_prev, v_prev; // Velocity
let dens, dens_prev;      // Density (Dye)
let displayBuffer;

let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        N = e.data.size;
        size = (N + 2) * (N + 2); // Padding
        
        u = new Float32Array(size); v = new Float32Array(size);
        u_prev = new Float32Array(size); v_prev = new Float32Array(size);
        dens = new Float32Array(size); dens_prev = new Float32Array(size);
        
        displayBuffer = new Uint32Array(N * N); // For rendering
        
        visc = e.data.viscosity;
        diff = e.data.diffusion;
        iter = e.data.iterations;
        
        isRunning = true;
        loop();
    }
    else if (command === 'pause') isRunning = false;
    else if (command === 'resume') { isRunning = true; loop(); }
    else if (command === 'reset') {
        u.fill(0); v.fill(0); u_prev.fill(0); v_prev.fill(0);
        dens.fill(0); dens_prev.fill(0);
    }
    else if (command === 'params') {
        visc = e.data.viscosity;
        diff = e.data.diffusion;
        iter = e.data.iterations;
    }
    else if (command === 'interact') {
        addForce(e.data.x, e.data.y, e.data.u, e.data.v);
    }
    else if (command === 'next') {
        displayBuffer = new Uint32Array(e.data.buffer);
        loop();
    }
};

function IX(x, y) {
    return x + (N + 2) * y;
}

function addForce(x, y, forceX, forceY) {
    // Add source at index
    // Safe bounds
    if (x < 1 || x > N || y < 1 || y > N) return;
    
    const i = IX(x, y);
    
    u[i] += forceX;
    v[i] += forceY;
    dens[i] += 100; // Add dye
}

function loop() {
    if (!isRunning) return;

    // Velocity Step
    vel_step(u, v, u_prev, v_prev, visc, dt);
    
    // Density Step
    dens_step(dens, dens_prev, u, v, diff, dt);
    
    // Render
    render();

    self.postMessage({
        type: 'frame',
        data: { buffer: displayBuffer.buffer }
    }, [displayBuffer.buffer]);
}

// Solver Core (Jos Stam)

function add_source(x, s, dt) {
    for (let i = 0; i < size; i++) x[i] += dt * s[i];
}

function diffuse(b, x, x0, diff, dt) {
    const a = dt * diff * N * N;
    
    // Gauss-Seidel Relaxation
    for (let k = 0; k < iter; k++) {
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i-1, j)] + x[IX(i+1, j)] + x[IX(i, j-1)] + x[IX(i, j+1)])) / (1 + 4 * a);
            }
        }
        set_bnd(b, x);
    }
}

function advect(b, d, d0, u, v, dt) {
    let i0, j0, i1, j1;
    let x, y, s0, t0, s1, t1, dt0;
    
    dt0 = dt * N;
    
    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= N; j++) {
            x = i - dt0 * u[IX(i, j)];
            y = j - dt0 * v[IX(i, j)];
            
            if (x < 0.5) x = 0.5; 
            if (x > N + 0.5) x = N + 0.5; 
            i0 = Math.floor(x); 
            i1 = i0 + 1;
            
            if (y < 0.5) y = 0.5; 
            if (y > N + 0.5) y = N + 0.5; 
            j0 = Math.floor(y); 
            j1 = j0 + 1;
            
            s1 = x - i0; s0 = 1 - s1;
            t1 = y - j0; t0 = 1 - t1;
            
            d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) +
                          s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
        }
    }
    set_bnd(b, d);
}

function project(u, v, p, div) {
    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= N; j++) {
            div[IX(i, j)] = -0.5 * (u[IX(i+1, j)] - u[IX(i-1, j)] + v[IX(i, j+1)] - v[IX(i, j-1)]) / N;
            p[IX(i, j)] = 0;
        }
    }
    set_bnd(0, div);
    set_bnd(0, p);
    
    // Poisson Equation Solver
    for (let k = 0; k < iter; k++) {
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                p[IX(i, j)] = (div[IX(i, j)] + p[IX(i-1, j)] + p[IX(i+1, j)] + p[IX(i, j-1)] + p[IX(i, j+1)]) / 4;
            }
        }
        set_bnd(0, p);
    }
    
    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= N; j++) {
            u[IX(i, j)] -= 0.5 * N * (p[IX(i+1, j)] - p[IX(i-1, j)]);
            v[IX(i, j)] -= 0.5 * N * (p[IX(i, j+1)] - p[IX(i, j-1)]);
        }
    }
    set_bnd(1, u);
    set_bnd(2, v);
}

function vel_step(u, v, u0, v0, visc, dt) {
    add_source(u, u0, dt);
    add_source(v, v0, dt);
    
    // Swap
    let tmp = u0; u0 = u; u = tmp;
    
    diffuse(1, u, u0, visc, dt);
    diffuse(2, v, v0, visc, dt);
    
    project(u, v, u0, v0);
    
    tmp = u0; u0 = u; u = tmp;
    tmp = v0; v0 = v; v = tmp;
    
    advect(1, u, u0, u0, v0, dt);
    advect(2, v, v0, u0, v0, dt);
    
    project(u, v, u0, v0);
}

function dens_step(x, x0, u, v, diff, dt) {
    add_source(x, x0, dt);
    
    let tmp = x0; x0 = x; x = tmp;
    diffuse(0, x, x0, diff, dt);
    
    tmp = x0; x0 = x; x = tmp;
    advect(0, x, x0, u, v, dt);
    
    // Decay dye?
    for(let i=0; i<size; i++) x[i] *= 0.995; 
    // Reset source buffer
    x0.fill(0);
}

function set_bnd(b, x) {
    // Walls
    for (let i = 1; i <= N; i++) {
        x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
        x[IX(N+1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
        x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
        x[IX(i, N+1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
    }
    // Corners
    x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, N+1)] = 0.5 * (x[IX(1, N+1)] + x[IX(0, N)]);
    x[IX(N+1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N+1, 1)]);
    x[IX(N+1, N+1)] = 0.5 * (x[IX(N, N+1)] + x[IX(N+1, N)]);
}

function render() {
    // Map density to color
    // ABGR
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const d = dens[IX(x+1, y+1)];
            // Clamping
            const val = Math.min(255, Math.floor(d * 255));
            
            // Color Map: Purple Haze
            // High density -> White/Bright
            // Low -> Dark Purple
            
            const r = Math.min(255, val * 2);
            const g = Math.min(255, val);
            const b = Math.min(255, val * 2 + 50);
            
            displayBuffer[y * N + x] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
    }
}
