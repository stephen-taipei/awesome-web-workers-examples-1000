// N-Body Gravity Worker

let bodies; // Float32Array [x, y, vx, vy]
let G = 1.0;
let softening = 5.0;
let count = 0;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'init') {
        count = e.data.count;
        const w = e.data.width;
        const h = e.data.height;
        G = e.data.G;
        softening = e.data.softening;

        // Init Galaxy (Disk)
        bodies = new Float32Array(count * 4);
        
        for(let i=0; i<count; i++) {
            // Random radius and angle
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 150; // Ring
            
            const x = w/2 + Math.cos(angle) * dist;
            const y = h/2 + Math.sin(angle) * dist;
            
            // Orbital velocity (approx sqrt(M/r))
            // Center mass is roughly 'count'
            const v = Math.sqrt(G * count / dist) * 0.5; 
            
            const vx = -Math.sin(angle) * v;
            const vy = Math.cos(angle) * v;
            
            bodies[i*4] = x;
            bodies[i*4+1] = y;
            bodies[i*4+2] = vx;
            bodies[i*4+3] = vy;
        }
        
        // Add massive black hole in center
        bodies[0] = w/2;
        bodies[1] = h/2;
        bodies[2] = 0;
        bodies[3] = 0;
        // We handle mass as uniform 1 for all, except index 0?
        // For brute force O(N^2) usually mass is array. 
        // Simplifying: All particles mass = 1, except center.
        // Center mass hack: we will just add extra gravity towards center or treat idx 0 as heavy.
        
        send();
    } 
    else if (command === 'params') {
        G = e.data.G;
        softening = e.data.softening;
    }
    else if (command === 'next') {
        // Receive buffer back
        bodies = new Float32Array(e.data.buffer);
        step();
        send();
    }
};

function step() {
    const dt = 0.1;
    const centerMass = 500; // Heavy center
    
    for (let i = 0; i < count; i++) {
        let fx = 0, fy = 0;
        const x1 = bodies[i*4];
        const y1 = bodies[i*4+1];
        
        for (let j = 0; j < count; j++) {
            if (i === j) continue;
            
            const x2 = bodies[j*4];
            const y2 = bodies[j*4+1];
            
            const dx = x2 - x1;
            const dy = y2 - y1;
            const distSq = dx*dx + dy*dy + softening*softening;
            const dist = Math.sqrt(distSq);
            
            // F = G * m1 * m2 / r^2
            // Vector F = F * (dx/r) = G * m * m / r^3 * dx
            
            let massJ = 1;
            if (j === 0) massJ = centerMass; 
            
            const f = (G * massJ) / (distSq * dist);
            
            fx += f * dx;
            fy += f * dy;
        }
        
        // Update Velocity
        bodies[i*4+2] += fx * dt;
        bodies[i*4+3] += fy * dt;
    }
    
    // Update Position
    for (let i = 0; i < count; i++) {
        // Center is static-ish? No, let it move too if we want realism.
        if (i === 0) continue; // Pin Black Hole
        
        bodies[i*4] += bodies[i*4+2] * dt;
        bodies[i*4+1] += bodies[i*4+3] * dt;
    }
}

function send() {
    // Transfer buffer to main thread to avoid copy
    self.postMessage({
        type: 'frame',
        data: { bodies }
    }, [bodies.buffer]);
}
