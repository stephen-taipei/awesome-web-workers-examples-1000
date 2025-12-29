/**
 * Wave Simulation - Web Worker
 * 2D wave equation solver
 */

let width = 400;
let height = 300;
let waveSpeed = 0.5;
let damping = 0.99;
let current = null;
let previous = null;
let isRunning = false;
let interval = null;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            width = payload.width;
            height = payload.height;
            waveSpeed = payload.waveSpeed;
            damping = payload.damping;
            initWave();
            startSimulation();
            break;
        case 'STOP':
            stopSimulation();
            break;
        case 'DISTURB':
            disturb(payload.x, payload.y, payload.amplitude);
            break;
        case 'CLEAR':
            initWave();
            break;
    }
};

function initWave() {
    const size = width * height;
    current = new Float32Array(size);
    previous = new Float32Array(size);
}

function startSimulation() {
    isRunning = true;
    interval = setInterval(update, 1000 / 60);
}

function stopSimulation() {
    isRunning = false;
    if (interval) clearInterval(interval);
}

function disturb(x, y, amplitude) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;

    const radius = 5;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= radius) {
                    const idx = py * width + px;
                    current[idx] += amplitude * (1 - dist / radius);
                }
            }
        }
    }
}

function update() {
    const c2 = waveSpeed * waveSpeed;

    // Swap buffers
    const temp = previous;
    previous = current;
    current = temp;

    // Wave equation: new = 2*current - previous + c^2 * laplacian(current)
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const left = previous[idx - 1];
            const right = previous[idx + 1];
            const up = previous[idx - width];
            const down = previous[idx + width];
            const center = previous[idx];

            // Laplacian
            const laplacian = left + right + up + down - 4 * center;

            // Update
            current[idx] = 2 * center - current[idx] + c2 * laplacian;

            // Damping
            current[idx] *= damping;

            // Clamp
            if (current[idx] > 1) current[idx] = 1;
            if (current[idx] < -1) current[idx] = -1;
        }
    }

    // Boundary conditions (fixed edges)
    for (let x = 0; x < width; x++) {
        current[x] = 0;
        current[(height - 1) * width + x] = 0;
    }
    for (let y = 0; y < height; y++) {
        current[y * width] = 0;
        current[y * width + width - 1] = 0;
    }

    self.postMessage({
        type: 'STATE',
        payload: {
            wave: current
        }
    });
}
