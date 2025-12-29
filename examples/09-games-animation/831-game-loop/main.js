/**
 * Game Loop - Main Thread
 * Renders game state received from Web Worker
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let lastRenderTime = 0;
let frameCount = 0;
let fpsUpdateTime = 0;

const elements = {
    startBtn: null,
    stopBtn: null,
    tickRate: null,
    entityCount: null,
    fps: null,
    tickTime: null,
    entities: null
};

document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupCanvas();
    setupEventListeners();
});

function initializeElements() {
    elements.startBtn = document.getElementById('startBtn');
    elements.stopBtn = document.getElementById('stopBtn');
    elements.tickRate = document.getElementById('tickRate');
    elements.entityCount = document.getElementById('entityCount');
    elements.fps = document.getElementById('fps');
    elements.tickTime = document.getElementById('tickTime');
    elements.entities = document.getElementById('entities');
}

function setupCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    clearCanvas();
}

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function setupEventListeners() {
    elements.startBtn.addEventListener('click', startGameLoop);
    elements.stopBtn.addEventListener('click', stopGameLoop);
}

function startGameLoop() {
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;

    const tickRate = parseInt(elements.tickRate.value) || 60;
    const entityCount = parseInt(elements.entityCount.value) || 100;

    worker.postMessage({
        type: 'START',
        payload: { tickRate, entityCount, canvasWidth: canvas.width, canvasHeight: canvas.height }
    });

    isRunning = true;
    elements.startBtn.disabled = true;
    elements.stopBtn.disabled = false;
    fpsUpdateTime = performance.now();
    frameCount = 0;
    requestAnimationFrame(render);
}

function stopGameLoop() {
    if (worker) {
        worker.postMessage({ type: 'STOP' });
        worker.terminate();
        worker = null;
    }

    isRunning = false;
    elements.startBtn.disabled = false;
    elements.stopBtn.disabled = true;
    clearCanvas();
}

let currentState = null;

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'STATE':
            currentState = payload;
            elements.tickTime.textContent = `${payload.tickTime.toFixed(2)} ms`;
            elements.entities.textContent = payload.entities.length;
            break;
        case 'ERROR':
            console.error('Worker error:', payload.message);
            break;
    }
}

function handleWorkerError(error) {
    console.error('Worker error:', error);
    stopGameLoop();
}

function render(timestamp) {
    if (!isRunning) return;

    frameCount++;
    if (timestamp - fpsUpdateTime >= 1000) {
        elements.fps.textContent = frameCount;
        frameCount = 0;
        fpsUpdateTime = timestamp;
    }

    if (currentState) {
        renderState(currentState);
    }

    requestAnimationFrame(render);
}

function renderState(state) {
    clearCanvas();

    state.entities.forEach(entity => {
        ctx.beginPath();
        ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
        ctx.fillStyle = entity.color;
        ctx.fill();
        ctx.closePath();
    });

    ctx.fillStyle = '#4a9eff';
    ctx.font = '14px monospace';
    ctx.fillText(`Tick: ${state.tick}`, 10, 20);
}
