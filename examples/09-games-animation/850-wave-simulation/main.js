/**
 * Wave Simulation - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let waveData = null;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('clearBtn').addEventListener('click', clear);

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleDrag);

    clearCanvas();
});

let isMouseDown = false;
canvas?.addEventListener('mousedown', () => isMouseDown = true);
canvas?.addEventListener('mouseup', () => isMouseDown = false);

function handleClick(e) {
    if (!worker) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    worker.postMessage({ type: 'DISTURB', payload: { x, y, amplitude: 50 } });
}

function handleDrag(e) {
    if (!isMouseDown || !worker) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
    worker.postMessage({ type: 'DISTURB', payload: { x, y, amplitude: 20 } });
}

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function start() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    worker.postMessage({
        type: 'START',
        payload: {
            width: canvas.width,
            height: canvas.height,
            waveSpeed: parseFloat(document.getElementById('waveSpeed').value),
            damping: parseFloat(document.getElementById('damping').value)
        }
    });

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    requestAnimationFrame(render);
}

function stop() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

function clear() {
    if (worker) {
        worker.postMessage({ type: 'CLEAR' });
    }
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        waveData = payload.wave;
    }
}

function render() {
    if (!isRunning) return;

    if (waveData) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < waveData.length; i++) {
            const value = waveData[i];
            const idx = i * 4;

            // Map wave height to color
            const normalized = (value + 1) / 2; // -1 to 1 => 0 to 1
            const r = Math.floor(normalized * 100 + 26);
            const g = Math.floor(normalized * 158 + 50);
            const b = Math.floor(normalized * 255 + 100);

            data[idx] = Math.min(255, r);
            data[idx + 1] = Math.min(255, g);
            data[idx + 2] = Math.min(255, b);
            data[idx + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    requestAnimationFrame(render);
}
