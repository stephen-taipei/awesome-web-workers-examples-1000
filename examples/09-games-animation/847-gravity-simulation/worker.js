/**
 * Gravity Simulation - Web Worker
 * N-body gravitational simulation
 */

let bodies = [];
let G = 1;
let width = 800;
let height = 600;
let isRunning = false;
let interval = null;
let nextId = 0;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            G = payload.gravityStrength;
            width = payload.width;
            height = payload.height;
            initBodies(payload.bodyCount);
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'ADD_SUN':
            addCentralSun();
            break;
    }
};

function initBodies(count) {
    bodies = [];
    nextId = 0;

    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 200;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        // Orbital velocity
        const orbitalSpeed = Math.sqrt(G * 100 / distance) * 0.5;
        const vx = -Math.sin(angle) * orbitalSpeed;
        const vy = Math.cos(angle) * orbitalSpeed;

        const mass = 1 + Math.random() * 3;
        const hue = Math.random() * 360;

        bodies.push({
            id: nextId++,
            x, y, vx, vy,
            mass,
            radius: Math.sqrt(mass) * 2,
            r: hslToRgb(hue / 360, 0.7, 0.6).r,
            g: hslToRgb(hue / 360, 0.7, 0.6).g,
            b: hslToRgb(hue / 360, 0.7, 0.6).b
        });
    }
}

function addCentralSun() {
    bodies.push({
        id: nextId++,
        x: width / 2,
        y: height / 2,
        vx: 0, vy: 0,
        mass: 500,
        radius: 20,
        r: 255, g: 200, b: 50
    });
}

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
    const dt = 0.5;

    // Calculate forces
    for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        let fx = 0, fy = 0;

        for (let j = 0; j < bodies.length; j++) {
            if (i === j) continue;
            const b = bodies[j];

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            if (dist < a.radius + b.radius) continue; // Collision

            const force = (G * a.mass * b.mass) / (distSq + 100);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
        }

        a.ax = fx / a.mass;
        a.ay = fy / a.mass;
    }

    // Update velocities and positions
    for (const body of bodies) {
        body.vx += body.ax * dt;
        body.vy += body.ay * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;

        // Soft boundary
        const margin = 50;
        if (body.x < margin) body.vx += 0.1;
        if (body.x > width - margin) body.vx -= 0.1;
        if (body.y < margin) body.vy += 0.1;
        if (body.y > height - margin) body.vy -= 0.1;
    }

    // Merge colliding bodies
    for (let i = bodies.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
            const a = bodies[i];
            const b = bodies[j];
            if (!a || !b) continue;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < a.radius + b.radius) {
                // Merge into larger body
                const totalMass = a.mass + b.mass;
                b.x = (a.x * a.mass + b.x * b.mass) / totalMass;
                b.y = (a.y * a.mass + b.y * b.mass) / totalMass;
                b.vx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
                b.vy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
                b.mass = totalMass;
                b.radius = Math.sqrt(b.mass) * 2;
                bodies.splice(i, 1);
                break;
            }
        }
    }

    const simTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            bodies: bodies.map(b => ({
                id: b.id, x: b.x, y: b.y,
                radius: b.radius,
                r: b.r, g: b.g, b: b.b
            })),
            simTime
        }
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
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
