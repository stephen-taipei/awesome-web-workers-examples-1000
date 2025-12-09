const startMainBtn = document.getElementById('startMainBtn');
const startWorkerBtn = document.getElementById('startWorkerBtn');
const stopBtn = document.getElementById('stopBtn');
const objectCountInput = document.getElementById('objectCount');
const fpsMainDisplay = document.getElementById('fpsMain');
const fpsWorkerDisplay = document.getElementById('fpsWorker');

const canvasMain = document.getElementById('canvasMain');
const canvasWorker = document.getElementById('canvasWorker');

let worker = null;
let mainAnimationId = null;
let isWorkerRunning = false;

// Main Thread Animation Logic
function startMainThreadAnimation(count) {
    const ctx = canvasMain.getContext('2d');
    const width = canvasMain.width;
    const height = canvasMain.height;

    // Create random objects
    const objects = [];
    for (let i = 0; i < count; i++) {
        objects.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
    }

    let lastTime = performance.now();
    let frames = 0;
    let fpsTime = lastTime;

    function animate() {
        const now = performance.now();

        // Update FPS
        frames++;
        if (now - fpsTime >= 1000) {
            fpsMainDisplay.textContent = Math.round((frames * 1000) / (now - fpsTime));
            frames = 0;
            fpsTime = now;
        }

        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trails effect
        ctx.fillRect(0, 0, width, height);

        // Update and Draw
        for (let i = 0; i < count; i++) {
            const obj = objects[i];
            obj.x += obj.vx;
            obj.y += obj.vy;

            // Bounce
            if (obj.x < 0 || obj.x > width) obj.vx *= -1;
            if (obj.y < 0 || obj.y > height) obj.vy *= -1;

            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, 2, 2);
        }

        mainAnimationId = requestAnimationFrame(animate);
    }

    animate();
}

function stopAnimations() {
    if (mainAnimationId) {
        cancelAnimationFrame(mainAnimationId);
        mainAnimationId = null;
    }

    if (worker) {
        worker.terminate();
        worker = null;
    }

    isWorkerRunning = false;
    startMainBtn.disabled = false;
    startWorkerBtn.disabled = false;
    stopBtn.disabled = true;
}

startMainBtn.addEventListener('click', () => {
    stopAnimations();
    const count = parseInt(objectCountInput.value);
    startMainBtn.disabled = true;
    startWorkerBtn.disabled = true;
    stopBtn.disabled = false;

    // Simulate heavy load on main thread by adding some busy work (optional, but shows impact)
    // For now, just running the animation loop is enough if count is high.
    startMainThreadAnimation(count);
});

startWorkerBtn.addEventListener('click', () => {
    stopAnimations();
    const count = parseInt(objectCountInput.value);
    startMainBtn.disabled = true;
    startWorkerBtn.disabled = true;
    stopBtn.disabled = false;

    // Use OffscreenCanvas
    // Note: OffscreenCanvas needs to be transferred to worker.
    // If worker is already terminated, we need a new canvas context or reset logic.
    // Since we can't easily reclaim a transferred canvas control, we might need to recreate the canvas element or reload page in a real app.
    // However, for this demo, we can just create a new worker.
    // BUT: A canvas element can only have its control transferred ONCE.
    // Solution: We will clone the node or alert user to refresh if they want to run worker again?
    // Better: Just use the existing canvas if possible, but transferControlToOffscreen makes it unavailable to main thread.
    // We will assume the user refreshes or we handle it by replacing the element.

    let offscreen;
    try {
        offscreen = canvasWorker.transferControlToOffscreen();
    } catch (e) {
        alert("Canvas already transferred. Please refresh the page to run Worker test again.");
        stopAnimations();
        return;
    }

    worker = new Worker('worker.js');
    worker.postMessage({
        canvas: offscreen,
        count: count,
        width: canvasWorker.width,
        height: canvasWorker.height
    }, [offscreen]);

    worker.onmessage = function(e) {
        if (e.data.type === 'fps') {
            fpsWorkerDisplay.textContent = e.data.value;
        }
    };
});

stopBtn.addEventListener('click', stopAnimations);
