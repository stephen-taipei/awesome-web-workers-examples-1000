/**
 * Particle Physics - Web Worker
 */

let particles = [];
let width = 800;
let height = 500;
let attraction = 0;
let isRunning = false;
let interval = null;
let collisionCount = 0;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            width = payload.width;
            height = payload.height;
            attraction = payload.attraction;
            initParticles(payload.particleCount);
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'SET_ATTRACTION':
            attraction = payload;
            break;
    }
};

function initParticles(count) {
    particles = [];
    const colors = [
        [74, 158, 255], [40, 167, 69], [255, 193, 7],
        [220, 53, 69], [23, 162, 184], [111, 66, 193]
    ];

    for (let i = 0; i < count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            radius: 5 + Math.random() * 10,
            mass: 1,
            r: color[0], g: color[1], b: color[2]
        });
        particles[i].mass = particles[i].radius * 0.5;
    }
}

function startSimulation() {
    isRunning = true;
    collisionCount = 0;
    interval = setInterval(update, 1000 / 60);
}

function stopSimulation() {
    isRunning = false;
    if (interval) clearInterval(interval);
}

function update() {
    const startTime = performance.now();
    let frameCollisions = 0;

    // Apply inter-particle forces
    if (attraction !== 0) {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i];
                const b = particles[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0 && dist < 200) {
                    const force = attraction * 0.5 / (dist * dist) * a.mass * b.mass;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    a.vx += fx / a.mass;
                    a.vy += fy / a.mass;
                    b.vx -= fx / b.mass;
                    b.vy -= fy / b.mass;
                }
            }
        }
    }

    // Update positions and handle collisions
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Damping
        p.vx *= 0.999;
        p.vy *= 0.999;

        // Boundary collisions
        if (p.x - p.radius < 0) { p.x = p.radius; p.vx *= -0.9; }
        if (p.x + p.radius > width) { p.x = width - p.radius; p.vx *= -0.9; }
        if (p.y - p.radius < 0) { p.y = p.radius; p.vy *= -0.9; }
        if (p.y + p.radius > height) { p.y = height - p.radius; p.vy *= -0.9; }
    }

    // Particle-particle collisions
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = a.radius + b.radius;

            if (dist < minDist && dist > 0) {
                frameCollisions++;

                // Separate particles
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                const totalMass = a.mass + b.mass;
                a.x -= nx * overlap * (b.mass / totalMass);
                a.y -= ny * overlap * (b.mass / totalMass);
                b.x += nx * overlap * (a.mass / totalMass);
                b.y += ny * overlap * (a.mass / totalMass);

                // Elastic collision response
                const dvx = a.vx - b.vx;
                const dvy = a.vy - b.vy;
                const dvn = dvx * nx + dvy * ny;

                if (dvn > 0) {
                    const restitution = 0.9;
                    const impulse = (2 * dvn) / totalMass * restitution;

                    a.vx -= impulse * b.mass * nx;
                    a.vy -= impulse * b.mass * ny;
                    b.vx += impulse * a.mass * nx;
                    b.vy += impulse * a.mass * ny;
                }
            }
        }
    }

    collisionCount = frameCollisions * 60;

    const physicsTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            particles: particles.map(p => ({
                x: p.x, y: p.y, radius: p.radius,
                r: p.r, g: p.g, b: p.b
            })),
            collisions: collisionCount,
            physicsTime
        }
    });
}
