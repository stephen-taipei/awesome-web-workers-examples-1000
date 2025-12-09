// FDTD Simulation (TMz mode)
// Simulates Ez, Hx, Hy fields

let Ez, Hx, Hy; // Fields
let Ca, Cb;     // Material coefficients
let displayBuffer;
let width, height;
let step = 0;
let isRunning = false;

let frequency = 10;
let simSpeed = 2; // steps per frame

// Constants
const imp0 = 377.0; // Impedance of free space

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        width = e.data.width;
        height = e.data.height;
        frequency = e.data.frequency;
        simSpeed = e.data.speed;
        
        const size = width * height;
        Ez = new Float32Array(size);
        Hx = new Float32Array(size);
        Hy = new Float32Array(size);
        
        Ca = new Float32Array(size).fill(1.0);
        Cb = new Float32Array(size).fill(0.5); // dt/eps*dx
        
        initMaterial(e.data.material);
        
        displayBuffer = new Uint32Array(size);
        
        isRunning = true;
        loop();
    }
    else if (command === 'pause') isRunning = false;
    else if (command === 'resume') { isRunning = true; loop(); }
    else if (command === 'reset') {
        Ez.fill(0); Hx.fill(0); Hy.fill(0);
        step = 0;
        // Keep materials? No, reset implies clear fields usually.
    }
    else if (command === 'params') {
        frequency = e.data.frequency;
        simSpeed = e.data.speed;
    }
    else if (command === 'material') {
        initMaterial(e.data.type);
    }
    else if (command === 'draw') {
        // Draw conductor
        const idx = e.data.y * width + e.data.x;
        if (idx >= 0 && idx < Ca.length) {
            Ca[idx] = 0; // Conductor -> Fields decay to 0? Or special handling?
            // Simple PEC (Perfect Electric Conductor) in FDTD is forcing E=0.
            // We use Ca=0 to prevent E update? No, Ca=1, Cb=0 usually.
            // Or just force E=0 in loop.
            // Let's use a flag array or just special Ca/Cb values.
            // Setting Cb=0 stops update from H. Setting Ca < 1 adds loss.
            // PEC: Ez always 0.
            Ca[idx] = -1; // Flag for PEC
        }
    }
    else if (command === 'next') {
        displayBuffer = new Uint32Array(e.data.buffer);
        loop();
    }
};

function initMaterial(type) {
    Ca.fill(1.0);
    Cb.fill(0.5); // Standard Courant number 0.5
    
    const cx = Math.floor(width/2);
    const cy = Math.floor(height/2);
    
    if (type === 'conductor') {
        // PEC Box
        for(let y=cy-20; y<cy+20; y++) {
            for(let x=cx-20; x<cx+20; x++) {
                Ca[y*width+x] = -1;
            }
        }
    } else if (type === 'dielectric') {
        // Glass lens
        for(let y=0; y<height; y++) {
            for(let x=0; x<width; x++) {
                if ((x-cx)**2 + (y-cy)**2 < 30*30) {
                    Cb[y*width+x] = 0.5 / 4; // eps_r = 4 (High refractive index)
                }
            }
        }
    }
}

function loop() {
    if (!isRunning) return;

    for (let k = 0; k < simSpeed; k++) {
        step++;
        
        // Update Magnetic Field (H)
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const i = y * width + x;
                // Hx(i,j) = Hx(i,j) - C * (Ez(i,j+1) - Ez(i,j))
                // Hy(i,j) = Hy(i,j) + C * (Ez(i+1,j) - Ez(i,j))
                
                Hx[i] -= 0.5 * (Ez[i + width] - Ez[i]);
                Hy[i] += 0.5 * (Ez[i + 1] - Ez[i]);
            }
        }
        
        // Update Electric Field (E)
        for (let y = 1; y < height; y++) {
            for (let x = 1; x < width; x++) {
                const i = y * width + x;
                
                if (Ca[i] === -1) {
                    Ez[i] = 0; // PEC
                    continue;
                }
                
                // Ez(i,j) = Ca*Ez(i,j) + Cb * ((Hy(i,j) - Hy(i-1,j)) - (Hx(i,j) - Hx(i,j-1)))
                
                Ez[i] = Ca[i] * Ez[i] + Cb[i] * (
                    (Hy[i] - Hy[i - 1]) - 
                    (Hx[i] - Hx[i - width])
                );
            }
        }
        
        // Source (Soft Source)
        const srcX = width / 4;
        const srcY = height / 2;
        const idx = Math.floor(srcY) * width + Math.floor(srcX);
        Ez[idx] += Math.sin(step * frequency * 0.05);
    }

    // Render Ez field
    for (let i = 0; i < width * height; i++) {
        // Map E (-1 to 1) to Color
        // Red (+), Blue (-)
        // ABGR
        
        let val = Ez[i];
        if (Ca[i] === -1) {
            displayBuffer[i] = 0xFFFFFFFF; // White conductor
            continue;
        }
        if (Cb[i] < 0.5 && Cb[i] > 0) {
            // Dielectric tint?
            // No simple tint, just field
        }
        
        val = Math.max(-1, Math.min(1, val)); // Clamp
        
        let r = 0, g = 0, b = 0;
        if (val > 0) {
            r = Math.floor(val * 255);
        } else {
            b = Math.floor(-val * 255);
        }
        
        // Add slight gray for dielectric visualization
        if (Cb[i] < 0.5) g = 50;
        
        displayBuffer[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }

    self.postMessage({
        type: 'frame',
        data: {
            buffer: displayBuffer.buffer,
            step
        }
    }, [displayBuffer.buffer]);
}
