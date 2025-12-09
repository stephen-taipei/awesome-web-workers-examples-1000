// Heat Equation Solver (Finite Difference Method)

let u; // Current Temp Grid (Float32)
let u_new; // Next Temp Grid
let displayBuffer; // Uint8ClampedArray
let size;
let alpha = 0.1; // Diffusivity
let boundary = 'fixed'; // fixed, insulated, periodic
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        size = e.data.size;
        alpha = e.data.alpha;
        boundary = e.data.boundary;
        
        const len = size * size;
        u = new Float32Array(len);
        u_new = new Float32Array(len);
        displayBuffer = new Uint8ClampedArray(len * 4);
        
        // Initial state: cold
        u.fill(0);
        
        isRunning = true;
        loop();
    }
    else if (command === 'params') {
        if (e.data.alpha) alpha = e.data.alpha;
        if (e.data.boundary) boundary = e.data.boundary;
    }
    else if (command === 'reset') {
        u.fill(0);
        u_new.fill(0);
    }
    else if (command === 'heat') {
        const { x, y, temp, radius } = e.data;
        // Add heat blob
        for(let dy = -radius; dy <= radius; dy++) {
            for(let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    if (dx*dx + dy*dy <= radius*radius) {
                        u[ny * size + nx] = temp;
                    }
                }
            }
        }
    }
    else if (command === 'next') {
        displayBuffer = new Uint8ClampedArray(e.data.buffer);
        loop();
    }
};

function loop() {
    if (!isRunning) return;

    // Finite Difference Step
    // u_new[i,j] = u[i,j] + alpha * dt * Laplacian(u)
    // For stability, alpha * dt / dx^2 <= 0.25
    // Assume dx=1. Max alpha 0.25. dt=1.
    
    // Optimization: 1D index loop
    
    let sumTemp = 0;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = y * size + x;
            
            // Neighbors
            let left = x - 1;
            let right = x + 1;
            let top = y - 1;
            let bottom = y + 1;
            
            let valL, valR, valT, valB;
            
            // Boundary Checks
            if (boundary === 'periodic') {
                if (left < 0) left = size - 1;
                if (right >= size) right = 0;
                if (top < 0) top = size - 1;
                if (bottom >= size) bottom = 0;
                valL = u[y * size + left];
                valR = u[y * size + right];
                valT = top * size + x >= 0 ? u[top * size + x] : 0; // safety
                valB = bottom * size + x < u.length ? u[bottom * size + x] : 0;
                // Indices calc needed
                valT = u[top * size + x];
                valB = u[bottom * size + x];
            } else if (boundary === 'insulated') {
                // Neumann: du/dn = 0 -> neighbor = self
                valL = left < 0 ? u[i] : u[y * size + left];
                valR = right >= size ? u[i] : u[y * size + right];
                valT = top < 0 ? u[i] : u[top * size + x];
                valB = bottom >= size ? u[i] : u[bottom * size + x];
            } else { // Fixed (Dirichlet u=0)
                valL = left < 0 ? 0 : u[y * size + left];
                valR = right >= size ? 0 : u[y * size + right];
                valT = top < 0 ? 0 : u[top * size + x];
                valB = bottom >= size ? 0 : u[bottom * size + x];
            }
            
            // Laplacian 5-point stencil
            const laplacian = valL + valR + valT + valB - 4 * u[i];
            
            u_new[i] = u[i] + alpha * laplacian;
            sumTemp += u_new[i];
        }
    }
    
    // Swap and Render
    const temp = u;
    u = u_new;
    u_new = temp;
    
    // Color Map (Jet-like: Blue -> Cyan -> Green -> Yellow -> Red)
    // Temp 0..1
    
    for (let i = 0; i < u.length; i++) {
        let val = u[i];
        // Dissipate slightly to avoid explosion if unstable params
        if (val > 1) val = 1;
        if (val < 0) val = 0;
        
        const idx = i * 4;
        
        // Simple Heat Map
        // 0.0 - 0.25: Blue to Cyan
        // 0.25 - 0.5: Cyan to Green
        // 0.5 - 0.75: Green to Yellow
        // 0.75 - 1.0: Yellow to Red
        
        let r=0, g=0, b=0;
        
        if (val < 0.25) {
            b = 255;
            g = Math.floor(val * 4 * 255);
        } else if (val < 0.5) {
            b = Math.floor((0.5 - val) * 4 * 255);
            g = 255;
        } else if (val < 0.75) {
            g = 255;
            r = Math.floor((val - 0.5) * 4 * 255);
        } else {
            g = Math.floor((1.0 - val) * 4 * 255);
            r = 255;
        }
        
        displayBuffer[idx] = r;
        displayBuffer[idx+1] = g;
        displayBuffer[idx+2] = b;
        displayBuffer[idx+3] = 255;
    }

    self.postMessage({
        type: 'frame',
        data: {
            buffer: displayBuffer.buffer,
            avgTemp: sumTemp / u.length,
            width: size,
            height: size
        }
    }, [displayBuffer.buffer]);
}
