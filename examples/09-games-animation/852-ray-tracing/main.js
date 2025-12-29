/**
 * Ray Tracing - Main Thread
 */

let worker = null;
let canvas, ctx;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('renderBtn').addEventListener('click', render);

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    document.getElementById('renderBtn').disabled = true;
    document.getElementById('progress').textContent = '0%';

    const resolution = parseInt(document.getElementById('resolution').value);

    worker.postMessage({
        type: 'RENDER',
        payload: {
            width: resolution,
            height: resolution,
            maxBounces: parseInt(document.getElementById('maxBounces').value)
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            document.getElementById('progress').textContent = `${payload.percent}%`;
            break;
        case 'ROW':
            drawRow(payload.y, payload.pixels, payload.width);
            break;
        case 'COMPLETE':
            document.getElementById('progress').textContent = '100%';
            document.getElementById('renderTime').textContent = `${payload.time.toFixed(0)} ms`;
            document.getElementById('renderBtn').disabled = false;
            break;
    }
}

function drawRow(y, pixels, srcWidth) {
    const scaleX = canvas.width / srcWidth;
    const scaleY = canvas.height / srcWidth;

    for (let x = 0; x < srcWidth; x++) {
        const idx = x * 3;
        ctx.fillStyle = `rgb(${pixels[idx]}, ${pixels[idx + 1]}, ${pixels[idx + 2]})`;
        ctx.fillRect(x * scaleX, y * scaleY, scaleX + 1, scaleY + 1);
    }
}
