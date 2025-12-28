/**
 * Lighting Engine - Main Thread
 */
let worker = null, canvas, ctx, isRunning = false;
let lights = [
    { x: 200, y: 200, radius: 150, r: 255, g: 200, b: 100, intensity: 1 },
    { x: 600, y: 300, radius: 180, r: 100, g: 150, b: 255, intensity: 0.8 }
];

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('addLightBtn').addEventListener('click', addLight);
    canvas.addEventListener('mousemove', e => {
        if (!isRunning) return;
        const rect = canvas.getBoundingClientRect();
        lights[0].x = (e.clientX - rect.left) * (canvas.width / rect.width);
        lights[0].y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
});

function addLight() {
    const colors = [[255,100,100],[100,255,100],[100,100,255],[255,255,100]];
    const c = colors[Math.floor(Math.random() * colors.length)];
    lights.push({ x: Math.random()*800, y: Math.random()*500, radius: 100+Math.random()*100, r:c[0], g:c[1], b:c[2], intensity: 0.7 });
}

function start() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => {
        if (e.data.type === 'FRAME') {
            const img = new ImageData(new Uint8ClampedArray(e.data.payload.pixels), canvas.width, canvas.height);
            ctx.putImageData(img, 0, 0);
        }
    };
    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    update();
}

function stop() {
    if (worker) { worker.terminate(); worker = null; }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

function update() {
    if (!isRunning) return;
    worker.postMessage({ type: 'RENDER', payload: { lights, width: canvas.width, height: canvas.height } });
    requestAnimationFrame(update);
}
