/**
 * Fluid Simulation - Web Worker
 * Simplified SPH-like simulation
 */

let particles = [];
let width = 800;
let height = 500;
let viscosity = 0.5;
let isRunning = false;
let interval = null;

const GRAVITY = 0.3;
const PRESSURE_MULT = 0.5;
const INTERACTION_RADIUS = 30;
const REST_DENSITY = 1;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            width = payload.width;
            height = payload.height;
            viscosity = payload.viscosity;
            initParticles(payload.particleCount);
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'FORCE':
            applyForce(payload);
            break;
    }
};

function initParticles(count) {
    particles = [];
    const cols = Math.ceil(Math.sqrt(count));
    const spacing = 15;

    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        particles.push({
            x: 100 + col * spacing,
            y: 50 + row * spacing,
            vx: 0,
            vy: 0,
            radius: 5,
            density: 0,
            pressure: 0
        });
    }
}

function startSimulation() {
    isRunning = true;
    interval = setInterval(update, 1000 / 60);
}

function stopSimulation() {
    isRunning = false;
    if (interval) clearInterval(interval);
}

function applyForce(force) {
    for (const p of particles) {
        const dx = p.x - force.x;
        const dy = p.y - force.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < force.radius && dist > 0) {
            const strength = (1 - dist / force.radius) * force.strength;
            p.vx += (dx / dist) * strength;
            p.vy += (dy / dist) * strength;
        }
    }
}

function update() {
    const startTime = performance.now();

    // Calculate density and pressure
    for (const p of particles) {
        p.density = 0;
        for (const other of particles) {
            const dx = other.x - p.x;
            const dy = other.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < INTERACTION_RADIUS) {
                const influence = 1 - dist / INTERACTION_RADIUS;
                p.density += influence * influence;
            }
        }
        p.pressure = (p.density - REST_DENSITY) * PRESSURE_MULT;
    }

    // Apply forces
    for (const p of particles) {
        let fx = 0, fy = GRAVITY;

        for (const other of particles) {
            if (p === other) continue;

            const dx = other.x - p.x;
            const dy = other.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < INTERACTION_RADIUS && dist > 0) {
                const influence = 1 - dist / INTERACTION_RADIUS;
                const nx = dx / dist;
                const ny = dy / dist;

                // Pressure force
                const pressureForce = -(p.pressure + other.pressure) * 0.5 * influence;
                fx += nx * pressureForce;
                fy += ny * pressureForce;

                // Viscosity
                fx += (other.vx - p.vx) * viscosity * influence * 0.1;
                fy += (other.vy - p.vy) * viscosity * influence * 0.1;
            }
        }

        p.vx += fx;
        p.vy += fy;
    }

    // Update positions
    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Boundary
        const margin = p.radius;
        if (p.x < margin) { p.x = margin; p.vx *= -0.5; }
        if (p.x > width - margin) { p.x = width - margin; p.vx *= -0.5; }
        if (p.y < margin) { p.y = margin; p.vy *= -0.5; }
        if (p.y > height - margin) { p.y = height - margin; p.vy *= -0.5; }
    }

    const simTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            particles: particles.map(p => ({
                x: p.x, y: p.y,
                radius: p.radius,
                density: Math.min(1, p.density / 3)
            })),
            simTime
        }
    });
}
