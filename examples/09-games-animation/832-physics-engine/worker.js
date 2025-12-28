/**
 * Physics Engine - Web Worker
 * 2D physics simulation with gravity and collisions
 */

let bodies = [];
let gravity = 9.8;
let restitution = 0.8;
let width = 800;
let height = 400;
let isRunning = false;
let interval = null;

const colors = ['#4a9eff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'];

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            gravity = payload.gravity;
            restitution = payload.restitution;
            width = payload.width;
            height = payload.height;
            bodies = [];
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'ADD_BODY':
            addBody(payload);
            break;
    }
};

function startSimulation() {
    isRunning = true;
    // Add initial bodies
    for (let i = 0; i < 10; i++) {
        addBody({
            x: Math.random() * width,
            y: Math.random() * height * 0.5,
            radius: 10 + Math.random() * 20
        });
    }

    interval = setInterval(physicsStep, 1000 / 60);
}

function stopSimulation() {
    isRunning = false;
    if (interval) clearInterval(interval);
}

function addBody(config) {
    bodies.push({
        x: config.x,
        y: config.y,
        prevX: config.x,
        prevY: config.y,
        radius: config.radius,
        mass: config.radius * config.radius,
        color: colors[Math.floor(Math.random() * colors.length)]
    });
}

function physicsStep() {
    const startTime = performance.now();
    const dt = 1 / 60;
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
        // Apply gravity and integrate
        bodies.forEach(body => {
            const vx = body.x - body.prevX;
            const vy = body.y - body.prevY;

            body.prevX = body.x;
            body.prevY = body.y;

            body.x += vx;
            body.y += vy + gravity * subDt * subDt * 100;
        });

        // Resolve collisions
        resolveCollisions();

        // Boundary constraints
        bodies.forEach(body => {
            if (body.x - body.radius < 0) {
                body.x = body.radius;
                body.prevX = body.x + (body.x - body.prevX) * restitution;
            }
            if (body.x + body.radius > width) {
                body.x = width - body.radius;
                body.prevX = body.x + (body.x - body.prevX) * restitution;
            }
            if (body.y - body.radius < 0) {
                body.y = body.radius;
                body.prevY = body.y + (body.y - body.prevY) * restitution;
            }
            if (body.y + body.radius > height) {
                body.y = height - body.radius;
                body.prevY = body.y + (body.y - body.prevY) * restitution;
            }
        });
    }

    const physicsTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            bodies: bodies.map(b => ({
                x: b.x,
                y: b.y,
                radius: b.radius,
                color: b.color
            })),
            physicsTime
        }
    });
}

function resolveCollisions() {
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = a.radius + b.radius;

            if (dist < minDist && dist > 0) {
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                const totalMass = a.mass + b.mass;
                const aRatio = b.mass / totalMass;
                const bRatio = a.mass / totalMass;

                a.x -= nx * overlap * aRatio;
                a.y -= ny * overlap * aRatio;
                b.x += nx * overlap * bRatio;
                b.y += ny * overlap * bRatio;
            }
        }
    }
}
