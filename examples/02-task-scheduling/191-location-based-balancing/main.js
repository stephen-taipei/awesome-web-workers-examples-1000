// Main thread script

const worker = new Worker('worker.js');
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const logContainer = document.getElementById('log');
const dcListDiv = document.getElementById('dcList');
const statsContentDiv = document.getElementById('statsContent');
const resetBtn = document.getElementById('resetBtn');
const autoModeCheckbox = document.getElementById('autoMode');

let currentState = {
    dataCenters: [],
    requests: []
};

// Logging
function log(msg) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logContainer.prepend(div);
}

// Draw Map
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw simplified world map background (shapes or just dots?)
    // For simplicity, we draw just the grid or leave it plain with DC markers
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Draw Voronoi regions (Optional visual aid to show boundaries)
    // Could be computationally expensive to do pixel-wise, skipping for now.

    // Draw Requests
    currentState.requests.forEach(req => {
        const dc = currentState.dataCenters.find(d => d.id === req.dcId);

        // Draw line to DC
        ctx.beginPath();
        ctx.moveTo(req.x, req.y);
        ctx.lineTo(dc.x, dc.y);
        ctx.strokeStyle = dc.color + '44'; // Transparent
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw request point
        ctx.beginPath();
        ctx.arc(req.x, req.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#555';
        ctx.fill();
    });

    // Draw Data Centers
    currentState.dataCenters.forEach(dc => {
        // Draw halo
        ctx.beginPath();
        ctx.arc(dc.x, dc.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = dc.color + '33';
        ctx.fill();

        // Draw center
        ctx.beginPath();
        ctx.arc(dc.x, dc.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = dc.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(dc.id, dc.x, dc.y + 25);
    });
}

function updateUI() {
    // Update DC List
    let listHtml = '';
    currentState.dataCenters.forEach(dc => {
        listHtml += `
            <div class="dc-item">
                <span class="color-dot" style="background-color: ${dc.color}"></span>
                ${dc.name}
            </div>
        `;
    });
    dcListDiv.innerHTML = listHtml;

    // Update Stats
    let statsHtml = '';
    const totalReqs = currentState.dataCenters.reduce((sum, dc) => sum + dc.requests, 0);

    currentState.dataCenters.forEach(dc => {
        const pct = totalReqs > 0 ? ((dc.requests / totalReqs) * 100).toFixed(1) : 0;
        statsHtml += `
            <div class="stat-item">
                <span><span class="color-dot" style="background-color: ${dc.color}"></span> ${dc.id}</span>
                <span>${dc.requests} reqs (${pct}%)</span>
            </div>
        `;
    });
    statsContentDiv.innerHTML = statsHtml;
}

// User Interaction
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale for canvas resolution vs display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    worker.postMessage({
        type: 'newRequest',
        payload: {
            x: x * scaleX,
            y: y * scaleY
        }
    });
});

resetBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'reset' });
});

autoModeCheckbox.addEventListener('change', (e) => {
    worker.postMessage({ type: 'setAutoMode', payload: e.target.checked });
});

// Worker Messages
worker.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'update') {
        currentState = payload;
        requestAnimationFrame(draw);
        updateUI();
    } else if (type === 'requestProcessed') {
        log(`請求處理 -> ${payload.dcName} (Latency: ${payload.request.latency}ms)`);
    } else if (type === 'log') {
        log(payload);
    }
};

// Start
worker.postMessage({ type: 'init' });
