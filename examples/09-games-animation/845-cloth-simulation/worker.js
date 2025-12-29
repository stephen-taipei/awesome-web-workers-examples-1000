/**
 * Cloth Simulation - Web Worker
 * Verlet integration with distance constraints
 */

let points = [];
let constraints = [];
let resolution = 20;
let stiffness = 0.9;
let width = 800;
let height = 600;
let isRunning = false;
let interval = null;

const GRAVITY = 0.5;
const DAMPING = 0.99;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            resolution = payload.resolution;
            stiffness = payload.stiffness;
            width = payload.width;
            height = payload.height;
            initCloth();
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'RESET':
            initCloth();
            break;
        case 'MOUSE':
            handleMouse(payload);
            break;
    }
};

function initCloth() {
    points = [];
    constraints = [];

    const spacing = (width * 0.6) / (resolution - 1);
    const startX = width * 0.2;
    const startY = 50;

    // Create points
    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const px = startX + x * spacing;
            const py = startY + y * spacing;

            points.push({
                x: px,
                y: py,
                prevX: px,
                prevY: py,
                pinned: y === 0 && (x % 4 === 0 || x === resolution - 1)
            });
        }
    }

    // Create constraints
    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            const idx = y * resolution + x;

            // Horizontal
            if (x < resolution - 1) {
                constraints.push({
                    p1: idx,
                    p2: idx + 1,
                    length: spacing
                });
            }

            // Vertical
            if (y < resolution - 1) {
                constraints.push({
                    p1: idx,
                    p2: idx + resolution,
                    length: spacing
                });
            }
        }
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

function handleMouse(mouse) {
    for (const p of points) {
        if (p.pinned) continue;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 0) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x += (dx / dist) * force * 10;
            p.y += (dy / dist) * force * 10;
        }
    }
}

function update() {
    const startTime = performance.now();

    // Verlet integration
    for (const p of points) {
        if (p.pinned) continue;

        const vx = (p.x - p.prevX) * DAMPING;
        const vy = (p.y - p.prevY) * DAMPING;

        p.prevX = p.x;
        p.prevY = p.y;

        p.x += vx;
        p.y += vy + GRAVITY;
    }

    // Solve constraints
    for (let iter = 0; iter < 5; iter++) {
        for (const c of constraints) {
            const p1 = points[c.p1];
            const p2 = points[c.p2];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) continue;

            const diff = (dist - c.length) / dist;
            const offsetX = dx * diff * 0.5 * stiffness;
            const offsetY = dy * diff * 0.5 * stiffness;

            if (!p1.pinned) {
                p1.x += offsetX;
                p1.y += offsetY;
            }
            if (!p2.pinned) {
                p2.x -= offsetX;
                p2.y -= offsetY;
            }
        }

        // Boundary constraints
        for (const p of points) {
            if (p.pinned) continue;

            if (p.x < 0) p.x = 0;
            if (p.x > width) p.x = width;
            if (p.y < 0) p.y = 0;
            if (p.y > height) p.y = height;
        }
    }

    const simTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            points: points.map(p => ({
                x: p.x, y: p.y, pinned: p.pinned
            })),
            resolution,
            simTime
        }
    });
}
