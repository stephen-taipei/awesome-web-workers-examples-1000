// Brownian Motion Worker

let particles; // Float32Array [x, y]
let width, height;
let speed = 5;
let step = 0;
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        const count = e.data.count;
        width = e.data.width;
        height = e.data.height;
        speed = e.data.speed;
        
        particles = new Float32Array(count * 2);
        
        // Start in center
        for(let i=0; i<count; i++) {
            particles[i*2] = width/2;
            particles[i*2+1] = height/2;
        }
        
        isRunning = true;
        loop();
    } 
    else if (command === 'params') {
        speed = e.data.speed;
    }
    else if (command === 'next') {
        particles = new Float32Array(e.data.buffer);
        loop();
    }
};

function loop() {
    if (!isRunning) return;

    const count = particles.length / 2;
    
    for (let i = 0; i < count; i++) {
        // Random Walk
        const dx = (Math.random() - 0.5) * speed;
        const dy = (Math.random() - 0.5) * speed;
        
        let x = particles[i*2] + dx;
        let y = particles[i*2+1] + dy;
        
        // Bounce walls? Or Wrap?
        // Let's bounce
        if (x < 0 || x > width) x = Math.max(0, Math.min(width, x));
        if (y < 0 || y > height) y = Math.max(0, Math.min(height, y));
        
        particles[i*2] = x;
        particles[i*2+1] = y;
    }
    
    step++;

    self.postMessage({
        type: 'frame',
        data: {
            particles,
            step
        }
    }, [particles.buffer]);
}
