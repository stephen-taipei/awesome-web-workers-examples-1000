const renderBtn = document.getElementById('renderBtn');
const playBtn = document.getElementById('playBtn');
const framesInput = document.getElementById('frames');
const zoomSelect = document.getElementById('zoomFactor');
const targetXInput = document.getElementById('targetX');
const targetYInput = document.getElementById('targetY');

const progressEl = document.getElementById('progress');
const renderTimeEl = document.getElementById('renderTime');
const memUsageEl = document.getElementById('memUsage');
const frameCounter = document.getElementById('frameCounter');
const canvas = document.getElementById('videoCanvas');
const ctx = canvas.getContext('2d');

let worker;
let generatedFrames = [];
let isPlaying = false;
let animationId;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'frame') {
            // Store frame
            // data.buffer is ArrayBuffer
            // Create ImageBitmap or similar?
            // For simplicity, store ImageData
            const imgData = new ImageData(new Uint8ClampedArray(data.buffer), canvas.width, canvas.height);
            generatedFrames[data.index] = imgData;
            
            // Update UI
            const percent = Math.round((generatedFrames.filter(f => f).length / parseInt(framesInput.value)) * 100);
            progressEl.textContent = `${percent}%`;
            
            // Estimate Memory
            const size = generatedFrames.length * canvas.width * canvas.height * 4;
            memUsageEl.textContent = `${(size / 1024 / 1024).toFixed(1)} MB`;
            
            // Draw latest
            ctx.putImageData(imgData, 0, 0);
            frameCounter.textContent = `Rendering Frame: ${data.index}`;

        } else if (type === 'done') {
            renderTimeEl.textContent = `${data.duration}ms`;
            renderBtn.disabled = false;
            playBtn.disabled = false;
            frameCounter.textContent = 'Ready to Play';
        }
    };
}

renderBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    // Clear old frames
    generatedFrames = [];
    isPlaying = false;
    cancelAnimationFrame(animationId);
    
    const config = {
        width: canvas.width,
        height: canvas.height,
        frames: parseInt(framesInput.value),
        totalZoom: parseFloat(zoomSelect.value),
        targetX: parseFloat(targetXInput.value),
        targetY: parseFloat(targetYInput.value)
    };
    
    renderBtn.disabled = true;
    playBtn.disabled = true;
    progressEl.textContent = '0%';
    renderTimeEl.textContent = '-';
    
    worker.postMessage({
        command: 'renderSequence',
        config
    });
});

playBtn.addEventListener('click', () => {
    if (isPlaying) {
        isPlaying = false;
        playBtn.textContent = 'Play Animation';
        cancelAnimationFrame(animationId);
    } else {
        if (generatedFrames.length === 0) return;
        isPlaying = true;
        playBtn.textContent = 'Pause';
        playAnimation(0);
    }
});

function playAnimation(frameIdx) {
    if (!isPlaying) return;
    
    if (frameIdx >= generatedFrames.length) {
        frameIdx = 0; // Loop
    }
    
    if (generatedFrames[frameIdx]) {
        ctx.putImageData(generatedFrames[frameIdx], 0, 0);
        frameCounter.textContent = `Frame: ${frameIdx}`;
    }
    
    // 30 fps roughly
    setTimeout(() => {
        animationId = requestAnimationFrame(() => playAnimation(frameIdx + 1));
    }, 33);
}

initWorker();
