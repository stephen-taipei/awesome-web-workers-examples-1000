/**
 * Particle Emitter - Web Worker
 */

let emitters = [];
let particles = [];
let width = 800;
let height = 500;
let isRunning = false;
let interval = null;

const emitterConfigs = {
    fire: {
        spawnRate: 5, lifetime: 1, gravity: -0.1, speed: 2,
        colors: [[255, 100, 0], [255, 200, 0], [255, 50, 0]],
        spread: 0.5, size: [3, 6]
    },
    fountain: {
        spawnRate: 3, lifetime: 2, gravity: 0.15, speed: 5,
        colors: [[100, 150, 255], [150, 200, 255]],
        spread: 0.3, size: [2, 4]
    },
    explosion: {
        spawnRate: 0, lifetime: 1, gravity: 0.05, speed: 8,
        colors: [[255, 100, 50], [255, 200, 100], [255, 255, 150]],
        spread: Math.PI, size: [2, 5], burst: 50
    },
    snow: {
        spawnRate: 2, lifetime: 5, gravity: 0.02, speed: 0.5,
        colors: [[255, 255, 255], [200, 220, 255]],
        spread: 0.1, size: [2, 4], sideways: true
    },
    sparkle: {
        spawnRate: 2, lifetime: 0.5, gravity: 0, speed: 1,
        colors: [[255, 255, 100], [255, 200, 50]],
        spread: Math.PI, size: [1, 3]
    }
};

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            width = payload.width;
            height = payload.height;
            emitters = [];
            particles = [];
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'ADD_EMITTER':
            addEmitter(payload);
            break;
        case 'CLEAR':
            emitters = [];
            particles = [];
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

function addEmitter(config) {
    const emitter = {
        x: config.x,
        y: config.y,
        type: config.emitterType,
        config: emitterConfigs[config.emitterType]
    };

    emitters.push(emitter);

    // Handle burst emitters
    if (emitter.config.burst) {
        for (let i = 0; i < emitter.config.burst; i++) {
            spawnParticle(emitter);
        }
    }
}

function update() {
    // Spawn particles from emitters
    emitters.forEach(emitter => {
        if (emitter.config.spawnRate > 0) {
            for (let i = 0; i < emitter.config.spawnRate; i++) {
                spawnParticle(emitter);
            }
        }
    });

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.vy += p.gravity;
        if (p.sideways) p.vx += (Math.random() - 0.5) * 0.1;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / 60;

        if (p.life <= 0 || p.y > height + 50 || p.y < -50) {
            particles.splice(i, 1);
        }
    }

    // Limit particles
    if (particles.length > 10000) {
        particles.splice(0, particles.length - 10000);
    }

    self.postMessage({
        type: 'STATE',
        payload: {
            particles: particles.map(p => ({
                x: p.x, y: p.y,
                size: p.size * (p.life / p.maxLife),
                r: p.r, g: p.g, b: p.b,
                alpha: p.life / p.maxLife
            })),
            emitterCount: emitters.length,
            particleCount: particles.length
        }
    });
}

function spawnParticle(emitter) {
    const cfg = emitter.config;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * cfg.spread * 2;
    const speed = cfg.speed * (0.8 + Math.random() * 0.4);
    const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    const life = cfg.lifetime * (0.8 + Math.random() * 0.4);

    particles.push({
        x: emitter.x + (Math.random() - 0.5) * 10,
        y: emitter.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: cfg.gravity,
        size: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]),
        life: life,
        maxLife: life,
        r: color[0], g: color[1], b: color[2],
        sideways: cfg.sideways || false
    });
}
