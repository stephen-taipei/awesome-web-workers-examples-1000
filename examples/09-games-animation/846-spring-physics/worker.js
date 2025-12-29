/**
 * Spring Physics - Web Worker
 * Hooke's law spring simulation
 */

let masses = [];
let springs = [];
let springK = 0.3;
let damping = 0.98;
let width = 800;
let height = 500;
let isRunning = false;
let interval = null;
let draggedMass = null;

const GRAVITY = 0.2;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            springK = payload.springK;
            damping = payload.damping;
            width = payload.width;
            height = payload.height;
            initSystem();
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'DRAG':
            if (payload.index >= 0 && payload.index < masses.length) {
                draggedMass = { index: payload.index, x: payload.x, y: payload.y };
            }
            break;
    }
};

function initSystem() {
    masses = [];
    springs = [];

    // Create a spring chain
    const startX = 100;
    const startY = 100;
    const spacing = 80;

    // Fixed anchor
    masses.push({ x: startX, y: startY, vx: 0, vy: 0, fixed: true });

    // Hanging masses
    for (let i = 1; i <= 6; i++) {
        masses.push({
            x: startX + i * spacing,
            y: startY + i * 30,
            vx: 0, vy: 0, fixed: false
        });
        springs.push({
            m1: i - 1, m2: i,
            restLength: spacing
        });
    }

    // Add another fixed point and connect
    masses.push({ x: width - 100, y: startY, vx: 0, vy: 0, fixed: true });
    springs.push({
        m1: masses.length - 2,
        m2: masses.length - 1,
        restLength: spacing
    });

    // Add cross springs for stability
    for (let i = 0; i < masses.length - 2; i++) {
        springs.push({
            m1: i, m2: i + 2,
            restLength: spacing * 2
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

function update() {
    // Handle dragging
    if (draggedMass !== null) {
        const m = masses[draggedMass.index];
        if (!m.fixed) {
            m.x = draggedMass.x;
            m.y = draggedMass.y;
            m.vx = 0;
            m.vy = 0;
        }
        draggedMass = null;
    }

    // Apply spring forces
    for (const spring of springs) {
        const m1 = masses[spring.m1];
        const m2 = masses[spring.m2];

        const dx = m2.x - m1.x;
        const dy = m2.y - m1.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) continue;

        const displacement = length - spring.restLength;
        const force = displacement * springK;

        const fx = (dx / length) * force;
        const fy = (dy / length) * force;

        if (!m1.fixed) {
            m1.vx += fx;
            m1.vy += fy;
        }
        if (!m2.fixed) {
            m2.vx -= fx;
            m2.vy -= fy;
        }
    }

    // Update positions
    let totalEnergy = 0;

    for (const m of masses) {
        if (m.fixed) continue;

        // Apply gravity
        m.vy += GRAVITY;

        // Apply damping
        m.vx *= damping;
        m.vy *= damping;

        // Update position
        m.x += m.vx;
        m.y += m.vy;

        // Boundary
        if (m.y > height - 20) {
            m.y = height - 20;
            m.vy *= -0.5;
        }

        // Calculate kinetic energy
        totalEnergy += 0.5 * (m.vx * m.vx + m.vy * m.vy);
    }

    // Calculate potential energy from springs
    for (const spring of springs) {
        const m1 = masses[spring.m1];
        const m2 = masses[spring.m2];
        const dx = m2.x - m1.x;
        const dy = m2.y - m1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const displacement = length - spring.restLength;
        totalEnergy += 0.5 * springK * displacement * displacement;
    }

    self.postMessage({
        type: 'STATE',
        payload: {
            masses: masses.map(m => ({ x: m.x, y: m.y, fixed: m.fixed })),
            springs: springs.map(s => ({ m1: s.m1, m2: s.m2, restLength: s.restLength })),
            energy: totalEnergy
        }
    });
}
