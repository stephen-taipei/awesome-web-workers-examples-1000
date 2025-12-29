/**
 * Particle System - Web Worker
 */

let particles = [];
let maxParticles = 5000;
let spawnRate = 50;
let width = 800;
let height = 500;
let isRunning = false;
let interval = null;
let mouseX = 400;
let mouseY = 250;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            maxParticles = payload.maxParticles;
            spawnRate = payload.spawnRate;
            width = payload.width;
            height = payload.height;
            mouseX = width / 2;
            mouseY = height / 2;
            particles = [];
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'MOUSE':
            mouseX = payload.x;
            mouseY = payload.y;
            break;
    }
};

function startSimulation() {
    isRunning = true;
    interval = setInterval(update, 1000 / 60);
}

function stopSimulation() {
    isRunning = false;
    if (interval) clearInterval(interval);
}

function update() {
    const startTime = performance.now();

    // Spawn new particles
    for (let i = 0; i < spawnRate && particles.length < maxParticles; i++) {
        spawnParticle();
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Apply gravity
        p.vy += 0.1;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Update lifetime
        p.life -= p.decay;

        // Remove dead particles
        if (p.life <= 0 || p.y > height + 50) {
            particles.splice(i, 1);
        }
    }

    const updateTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            particles: particles.map(p => ({
                x: p.x,
                y: p.y,
                size: p.size * (p.life / p.maxLife),
                r: p.r,
                g: p.g,
                b: p.b,
                alpha: p.life / p.maxLife
            })),
            count: particles.length,
            updateTime
        }
    });
}

function spawnParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    const life = 0.5 + Math.random() * 1;

    // Color based on angle
    const hue = (angle / (Math.PI * 2)) * 360;
    const color = hslToRgb(hue / 360, 0.8, 0.6);

    particles.push({
        x: mouseX,
        y: mouseY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 2 + Math.random() * 4,
        life: life,
        maxLife: life,
        decay: 0.01 + Math.random() * 0.02,
        r: color.r,
        g: color.g,
        b: color.b
    });
}

function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}
