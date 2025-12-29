/**
 * Pendulum Simulation - Web Worker
 * Double pendulum using Lagrangian mechanics
 */

let config = null;
let state = null;
let isRunning = false;
let interval = null;

const g = 1;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            config = payload;
            state = {
                a1: payload.angle1,
                a2: payload.angle2,
                a1_v: 0,
                a2_v: 0
            };
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
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
    const { length1: l1, length2: l2, mass1: m1, mass2: m2, originX, originY } = config;
    const { a1, a2, a1_v, a2_v } = state;

    // Double pendulum equations of motion (derived from Lagrangian)
    const num1 = -g * (2 * m1 + m2) * Math.sin(a1);
    const num2 = -m2 * g * Math.sin(a1 - 2 * a2);
    const num3 = -2 * Math.sin(a1 - a2) * m2;
    const num4 = a2_v * a2_v * l2 + a1_v * a1_v * l1 * Math.cos(a1 - a2);
    const den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const a1_a = (num1 + num2 + num3 * num4) / den;

    const num5 = 2 * Math.sin(a1 - a2);
    const num6 = a1_v * a1_v * l1 * (m1 + m2);
    const num7 = g * (m1 + m2) * Math.cos(a1);
    const num8 = a2_v * a2_v * l2 * m2 * Math.cos(a1 - a2);
    const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const a2_a = (num5 * (num6 + num7 + num8)) / den2;

    // Update velocities and angles
    state.a1_v += a1_a;
    state.a2_v += a2_a;
    state.a1 += state.a1_v;
    state.a2 += state.a2_v;

    // Apply slight damping
    state.a1_v *= 0.9999;
    state.a2_v *= 0.9999;

    // Calculate positions
    const x1 = originX + l1 * Math.sin(state.a1);
    const y1 = originY + l1 * Math.cos(state.a1);
    const x2 = x1 + l2 * Math.sin(state.a2);
    const y2 = y1 + l2 * Math.cos(state.a2);

    self.postMessage({
        type: 'STATE',
        payload: {
            originX, originY,
            x1, y1, x2, y2,
            mass1: m1, mass2: m2,
            angle1: state.a1,
            angle2: state.a2
        }
    });
}
