let canvas;
let ctx;
let isRunning = false;
let objects = [];
let lastTime = 0;
let frameCount = 0;
let fpsTimer = 0;

self.onmessage = function(e) {
    const { command, canvas: msgCanvas, count } = e.data;

    if (msgCanvas) {
        canvas = msgCanvas;
        ctx = canvas.getContext('2d');
    }

    if (command === 'start') {
        initObjects(count);
        isRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(renderLoop);
    } else if (command === 'stop') {
        isRunning = false;
    }
};

function initObjects(count) {
    objects = [];
    for (let i = 0; i < count; i++) {
        objects.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            color: `rgba(${Math.random()*255|0}, ${Math.random()*255|0}, ${Math.random()*255|0}, 0.7)`
        });
    }
}

function renderLoop(time) {
    if (!isRunning) return;

    const delta = time - lastTime;
    lastTime = time;

    // Update FPS
    frameCount++;
    if (time - fpsTimer > 1000) {
        self.postMessage({ type: 'fps', fps: frameCount });
        frameCount = 0;
        fpsTimer = time;
    }

    // Update & Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        obj.x += obj.vx;
        obj.y += obj.vy;

        if (obj.x < 0 || obj.x > canvas.width) obj.vx *= -1;
        if (obj.y < 0 || obj.y > canvas.height) obj.vy *= -1;

        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x, obj.y, 4, 4); // Simple rects for throughput
    }

    requestAnimationFrame(renderLoop);
}
