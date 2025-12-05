// Lattice Boltzmann Method (D2Q9) Worker

// Directions: 0:Center, 1:E, 2:N, 3:W, 4:S, 5:NE, 6:NW, 7:SW, 8:SE
const cx = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const cy = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const weights = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36];
const opp = [0, 3, 4, 1, 2, 7, 8, 5, 6]; // Opposite direction indices

let n0, nN, nS, nE, nW, nNE, nSE, nNW, nSW; // Microscopic densities (9 arrays)
let width, height;
let barrier; // Boolean array
let displayBuffer; // Uint32Array

let viscosity = 0.02;
let omega = 0; // Relaxation parameter 1 / (3*viscosity + 0.5)
let u0 = 0.1; // Inlet speed
let contrast = 3;
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        width = e.data.width;
        height = e.data.height;
        viscosity = e.data.viscosity;
        u0 = e.data.inletSpeed;
        
        initArrays();
        initBarrier(e.data.barrierType);
        computeOmega();
        
        isRunning = true;
        loop();
    }
    else if (command === 'pause') isRunning = false;
    else if (command === 'resume') { isRunning = true; loop(); }
    else if (command === 'reset') {
        // Reset flow, keep barrier? Or full reset.
        // Let's reset flow to 0 but keep inlet
        resetFlow();
    }
    else if (command === 'params') {
        if (e.data.viscosity) { viscosity = e.data.viscosity; computeOmega(); }
        if (e.data.inletSpeed) u0 = e.data.inletSpeed;
        if (e.data.contrast) contrast = e.data.contrast;
    }
    else if (command === 'barrier') {
        initBarrier(e.data.type);
    }
    else if (command === 'drawBarrier') {
        drawBarrier(e.data.x, e.data.y, e.data.radius);
    }
    else if (command === 'next') {
        displayBuffer = new Uint32Array(e.data.buffer);
        loop();
    }
};

function computeOmega() {
    omega = 1.0 / (3.0 * viscosity + 0.5);
}

function initArrays() {
    const size = width * height;
    n0 = new Float32Array(size); nN = new Float32Array(size); nS = new Float32Array(size);
    nE = new Float32Array(size); nW = new Float32Array(size); nNE = new Float32Array(size);
    nSE = new Float32Array(size); nNW = new Float32Array(size); nSW = new Float32Array(size);
    
    barrier = new Uint8Array(size);
    displayBuffer = new Uint32Array(size);
    
    resetFlow();
}

function resetFlow() {
    // Initial equilibrium with velocity 0 (except inlet logic later)
    const size = width * height;
    for (let i = 0; i < size; i++) {
        n0[i] = weights[0];
        nN[i] = weights[2]; nS[i] = weights[4];
        nE[i] = weights[1]; nW[i] = weights[3];
        nNE[i] = weights[5]; nSE[i] = weights[8];
        nNW[i] = weights[6]; nSW[i] = weights[7];
    }
}

function initBarrier(type) {
    barrier.fill(0);
    const cx = Math.floor(width / 3);
    const cy = Math.floor(height / 2);
    
    if (type === 'circle') {
        const r = Math.min(width, height) / 10;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if ((x-cx)**2 + (y-cy)**2 <= r*r) barrier[y*width+x] = 1;
            }
        }
    } else if (type === 'square') {
        const s = Math.min(width, height) / 8;
        for (let y = cy-s; y < cy+s; y++) {
            for (let x = cx-s; x < cx+s; x++) {
                if (x>=0 && x<width && y>=0 && y<height) barrier[y*width+x] = 1;
            }
        }
    } else if (type === 'line') {
        for (let y = cy - 40; y < cy + 40; y++) {
            barrier[y * width + cx] = 1;
        }
    }
}

function drawBarrier(mx, my, r) {
    for (let y = my - r; y <= my + r; y++) {
        for (let x = mx - r; x <= mx + r; x++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                barrier[y*width + x] = 1;
            }
        }
    }
}

function loop() {
    if (!isRunning) return;

    // LBM Steps
    // 1. Stream (Advection)
    // 2. Boundary Conditions (Bounce-back)
    // 3. Collide (Relaxation)
    
    // Streaming is moving data. Collision is local calc.
    // Often combined or swapped buffer.
    // Standard implementation uses loops.
    
    // Optimized loop: Combine stream + collide if possible, but streaming reads neighbors.
    // Need read/write buffers or careful order.
    // Simple way: Collision step in place, then Stream to new buffers?
    // Or standard: Stream to temp, then Collide in place.
    // Let's use Collide -> Stream order with separate arrays? 
    // For max perf in JS, we might need separate arrays for 'next' state.
    // But I allocated only one set.
    // Let's implement "Pull" streaming: n_new(x, i) = n_old(x - c_i, i) (post-collision).
    
    // Since we process 9 directions, allocating 9 temp arrays is heavy memory.
    // But we need them for correct parallel update simulation.
    // Actually, we can update in place if we are careful or use 2 sets.
    // Let's assume we need temporary storage.
    // To save memory, we can just allocate temp variables inside loop? No, need neighbor values.
    
    // Re-allocate temp arrays? No, keep them persistent.
    // Let's stick to a simpler approach: 
    // Use local variables for collision, store to "next" arrays, then swap.
    // Requires double memory.
    // For this demo, let's just define 'next' arrays.
    
    if (!self.n0_next) {
        const size = width * height;
        self.n0_next = new Float32Array(size); self.nN_next = new Float32Array(size);
        self.nS_next = new Float32Array(size); self.nE_next = new Float32Array(size);
        self.nW_next = new Float32Array(size); self.nNE_next = new Float32Array(size);
        self.nSE_next = new Float32Array(size); self.nNW_next = new Float32Array(size);
        self.nSW_next = new Float32Array(size);
    }

    // Simulation Steps per frame
    const steps = 6;
    for (let s = 0; s < steps; s++) {
        
        // Inlet Boundary (Left side) - Equilibrium at velocity u0
        for (let y = 0; y < height; y++) {
            const idx = y * width; // x=0
            if (!barrier[idx]) {
                const rho = 1;
                const u = u0;
                const v = 0;
                
                const ru = rho * u;
                const rv = rho * v;
                const u2 = u*u + v*v;
                
                // Set densities to equilibrium
                nE[idx] = weights[1] * rho * (1 + 3*u + 4.5*u*u - 1.5*u2);
                nW[idx] = weights[3] * rho * (1 - 3*u + 4.5*u*u - 1.5*u2);
                nNE[idx] = weights[5] * rho * (1 + 3*(u+v) + 4.5*(u+v)**2 - 1.5*u2);
                nSE[idx] = weights[8] * rho * (1 + 3*(u-v) + 4.5*(u-v)**2 - 1.5*u2);
                // ... others usually don't flow IN from left in this simple setup
                // Actually strictly enforcing equilibrium on boundary is easiest
                n0[idx] = weights[0] * rho * (1 - 1.5*u2);
                nN[idx] = weights[2] * rho * (1 + 3*v + 4.5*v*v - 1.5*u2);
                nS[idx] = weights[4] * rho * (1 - 3*v + 4.5*v*v - 1.5*u2);
                nNW[idx] = weights[6] * rho * (1 + 3*(-u+v) + 4.5*(-u+v)**2 - 1.5*u2);
                nSW[idx] = weights[7] * rho * (1 + 3*(-u-v) + 4.5*(-u-v)**2 - 1.5*u2);
            }
        }
        
        // Outlet (Right side) - Zero gradient (copy neighbor)
        for (let y = 0; y < height; y++) {
            const idx = y * width + (width - 1);
            const src = y * width + (width - 2);
            n0[idx]=n0[src]; nN[idx]=nN[src]; nS[idx]=nS[src];
            nE[idx]=nE[src]; nW[idx]=nW[src]; nNE[idx]=nNE[src];
            nSE[idx]=nSE[src]; nNW[idx]=nNW[src]; nSW[idx]=nSW[src];
        }

        // Collide & Stream
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                
                if (barrier[i]) {
                    // Bounce back handled at destination in "Pull" or here?
                    // Standard: if current is barrier, do nothing?
                    // Actually reflection happens.
                    // Simplest: if post-stream pos is barrier, reflect.
                    // Here we implement simple full bounce: n_new[opp] = n_old[curr]
                    continue; 
                }

                // Macroscopic variables
                const d0 = n0[i], dN = nN[i], dS = nS[i], dE = nE[i], dW = nW[i];
                const dNE = nNE[i], dSE = nSE[i], dNW = nNW[i], dSW = nSW[i];
                
                const rho = d0 + dN + dS + dE + dW + dNE + dSE + dNW + dSW;
                const ux = (dE + dNE + dSE - dW - dNW - dSW) / rho;
                const uy = (dN + dNE + dNW - dS - dSE - dSW) / rho;
                
                const u2 = ux*ux + uy*uy;
                
                // Collision (Relaxation to Equilibrium)
                const eq = (w, cx, cy) => {
                    const cu = cx*ux + cy*uy;
                    return w * rho * (1 + 3*cu + 4.5*cu*cu - 1.5*u2);
                };
                
                const n0_c = d0 + omega * (eq(weights[0], 0, 0) - d0);
                const nN_c = dN + omega * (eq(weights[2], 0, 1) - dN);
                const nS_c = dS + omega * (eq(weights[4], 0, -1) - dS);
                const nE_c = dE + omega * (eq(weights[1], 1, 0) - dE);
                const nW_c = dW + omega * (eq(weights[3], -1, 0) - dW);
                const nNE_c = dNE + omega * (eq(weights[5], 1, 1) - dNE);
                const nSE_c = dSE + omega * (eq(weights[8], 1, -1) - dSE);
                const nNW_c = dNW + omega * (eq(weights[6], -1, 1) - dNW);
                const nSW_c = dSW + omega * (eq(weights[7], -1, -1) - dSW);
                
                // Streaming (Pull)
                // Target is (x,y) in next frame. 
                // Wait, this loop is iterating target pixels (x,y).
                // So we calculate collision at (x,y) and then PUSH to neighbors? 
                // Or calculate collision at neighbors and PULL?
                
                // Standard PULL method:
                // n_new[i] = n_old[i - c](post-collision)
                
                // BUT calculating collision at every neighbor for every pixel is redundant.
                // Better: COLLIDE all first (in place? no), then STREAM.
                
                // Combined approach (Push):
                // Calculate collision at i, then distribute to neighbors in next arrays.
                
                // Streaming to neighbors:
                // E goes to x+1
                let ni = i; // 0 (Center)
                self.n0_next[ni] = n0_c;
                
                // E
                let nx = x + 1; let ny = y;
                if (nx < width) {
                    ni = ny * width + nx;
                    if (barrier[ni]) self.nW_next[i] = nE_c; // Bounce back to self(W)
                    else self.nE_next[ni] = nE_c;
                }
                
                // W
                nx = x - 1;
                if (nx >= 0) {
                    ni = y * width + nx;
                    if (barrier[ni]) self.nE_next[i] = nW_c; // Bounce back to self(E)
                    else self.nW_next[ni] = nW_c;
                }
                
                // N
                nx = x; ny = y + 1;
                if (ny < height) {
                    ni = ny * width + nx;
                    if (barrier[ni]) self.nS_next[i] = nN_c;
                    else self.nN_next[ni] = nN_c;
                }
                
                // S
                nx = x; ny = y - 1;
                if (ny >= 0) {
                    ni = ny * width + nx;
                    if (barrier[ni]) self.nN_next[i] = nS_c;
                    else self.nS_next[ni] = nS_c;
                }
                
                // NE
                nx = x + 1; ny = y + 1;
                if (nx < width && ny < height) {
                    ni = ny * width + nx;
                    if (barrier[ni]) self.nSW_next[i] = nNE_c;
                    else self.nNE_next[ni] = nNE_c;
                }
                
                // NW
                nx = x - 1; ny = y + 1;
                if (nx >= 0 && ny < height) {
                    ni = ny * width + nx;
                    if (barrier[ni]) self.nSE_next[i] = nNW_c;
                    else self.nNW_next[ni] = nNW_c;
                }
                
                // SE
                nx = x + 1; ny = y - 1;
                if (nx < width && ny >= 0) {
                    ni = ny * width + nx;
                    if (barrier[ni]) self.nNW_next[i] = nSE_c;
                    else self.nSE_next[ni] = nSE_c;
                }
                
                // SW
                nx = x - 1; ny = y - 1;
                if (nx >= 0 && ny >= 0) {
                    ni = ny * width + nx;
                    if (barrier[ni]) self.nNE_next[i] = nSW_c;
                    else self.nSW_next[ni] = nSW_c;
                }
            }
        }
        
        // Swap Pointers
        let tmp;
        tmp=n0; n0=self.n0_next; self.n0_next=tmp;
        tmp=nN; nN=self.nN_next; self.nN_next=tmp;
        tmp=nS; nS=self.nS_next; self.nS_next=tmp;
        tmp=nE; nE=self.nE_next; self.nE_next=tmp;
        tmp=nW; nW=self.nW_next; self.nW_next=tmp;
        tmp=nNE; nNE=self.nNE_next; self.nNE_next=tmp;
        tmp=nSE; nSE=self.nSE_next; self.nSE_next=tmp;
        tmp=nNW; nNW=self.nNW_next; self.nNW_next=tmp;
        tmp=nSW; nSW=self.nSW_next; self.nSW_next=tmp;
    }

    // Render Curl (Vorticity)
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            if (barrier[i]) {
                displayBuffer[i] = 0xFF808080; // Grey barrier
                continue;
            }
            
            // Compute velocity
            const rho = n0[i]+nN[i]+nS[i]+nE[i]+nW[i]+nNE[i]+nSE[i]+nNW[i]+nSW[i];
            const ux = (nE[i] + nNE[i] + nSE[i] - nW[i] - nNW[i] - nSW[i]) / rho;
            const uy = (nN[i] + nNE[i] + nNW[i] - nS[i] - nSE[i] - nSW[i]) / rho;
            
            // Compute Curl: dv/dx - du/dy
            // Finite diff
            const uy_x1 = (nN[i+1] + nNE[i+1] + nNW[i+1] - nS[i+1] - nSE[i+1] - nSW[i+1]) / rho; // approx
            const uy_x0 = (nN[i-1] + nNE[i-1] + nNW[i-1] - nS[i-1] - nSE[i-1] - nSW[i-1]) / rho;
            const dv_dx = (uy_x1 - uy_x0) / 2;
            
            const ux_y1 = (nE[i+width] + nNE[i+width] + nSE[i+width] - nW[i+width] - nNW[i+width] - nSW[i+width]) / rho;
            const ux_y0 = (nE[i-width] + nNE[i-width] + nSE[i-width] - nW[i-width] - nNW[i-width] - nSW[i-width]) / rho;
            const du_dy = (ux_y1 - ux_y0) / 2;
            
            const curl = (dv_dx - du_dy) * contrast * 10;
            
            // Map curl to color (Blue - Black - Red)
            // ABGR
            let r = 0, g = 0, b = 0;
            if (curl > 0) {
                r = Math.min(255, curl * 255);
                g = Math.max(0, 50 - curl * 50);
            } else {
                b = Math.min(255, -curl * 255);
                g = Math.max(0, 50 + curl * 50);
            }
            
            // Speed visualization if curl is low?
            // Just curl for now.
            
            displayBuffer[i] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
    }

    self.postMessage({
        type: 'frame',
        data: { buffer: displayBuffer.buffer }
    }, [displayBuffer.buffer]);
}
