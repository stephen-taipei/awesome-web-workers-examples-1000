// Main thread script

const worker = new Worker('worker.js');
const canvas = document.getElementById('serverCanvas');
const ctx = canvas.getContext('2d');
const logContainer = document.getElementById('log');

// Controls
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const algorithmSelect = document.getElementById('algorithm');
const requestRateInput = document.getElementById('requestRate');
const serverControlsDiv = document.getElementById('serverControls');

// Stats
const totalRequestsEl = document.getElementById('totalRequests');
const avgLatencyEl = document.getElementById('avgLatency');
const errorRateEl = document.getElementById('errorRate');

let isRunning = false;
let serverData = []; // Cached server data for UI rendering if needed outside message loop

// Logging
function log(msg) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logContainer.prepend(div);
    if (logContainer.children.length > 50) logContainer.lastChild.remove();
}

// Draw Visualization
function draw(servers) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 20;
    const serverWidth = (canvas.width - padding * 5) / 4;
    const serverHeight = 200;
    const baseY = 100;

    servers.forEach((server, index) => {
        const x = padding + index * (serverWidth + padding);
        const y = baseY;

        // Draw Server Box
        ctx.fillStyle = server.isDown ? '#ffebee' : '#e3f2fd';
        ctx.strokeStyle = server.isDown ? '#c62828' : '#1565c0';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(x, y, serverWidth, serverHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Server Name
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(server.name, x + serverWidth/2, y + 30);

        if (server.isDown) {
            ctx.fillStyle = '#c62828';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('OFFLINE', x + serverWidth/2, y + serverHeight/2);
            return;
        }

        // Active Connections Bar
        const maxConnections = 50; // Scale for visual
        const connectionHeight = Math.min(server.activeRequests / maxConnections, 1) * 100;

        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(x + 20, y + 140, serverWidth - 40, 10); // BG

        // Color based on load
        if (server.activeRequests > 30) ctx.fillStyle = '#e53935';
        else if (server.activeRequests > 15) ctx.fillStyle = '#fbc02d';
        else ctx.fillStyle = '#43a047';

        ctx.fillRect(x + 20, y + 140, (serverWidth - 40) * (Math.min(server.activeRequests, maxConnections) / maxConnections), 10);

        ctx.fillStyle = '#555';
        ctx.font = '12px Arial';
        ctx.fillText(`Active: ${server.activeRequests}`, x + serverWidth/2, y + 130);

        // Metrics
        ctx.textAlign = 'left';
        ctx.fillText(`Latency (Est): ${Math.round(server.avgResponseTime)}ms`, x + 10, y + 170);

        if (server.addedLatency > 0) {
            ctx.fillStyle = '#d32f2f';
            ctx.fillText(`+${server.addedLatency}ms lag`, x + 10, y + 190);
        }
    });

    // Draw Load Balancer (Top Center)
    const lbX = canvas.width / 2;
    const lbY = 40;

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(lbX, lbY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('LB', lbX, lbY + 5);

    // Draw lines to servers (Visualize traffic conceptually)
    // In a real animation we would draw moving dots
}

// Generate Server Controls
function renderServerControls(servers) {
    if (serverControlsDiv.children.length > 0) return; // Only render once or on reset

    servers.forEach(server => {
        const div = document.createElement('div');
        div.className = 'server-control-item';

        const header = document.createElement('h5');
        header.innerHTML = `
            ${server.name}
            <label style="display:inline; font-weight:normal; font-size:12px;">
                <input type="checkbox" class="server-toggle" data-id="${server.id}" ${!server.isDown ? 'checked' : ''}> Online
            </label>
        `;
        div.appendChild(header);

        const latencyControl = document.createElement('div');
        latencyControl.className = 'latency-control';
        latencyControl.innerHTML = `
            <span>Add Lag:</span>
            <input type="range" class="latency-slider" data-id="${server.id}" min="0" max="500" value="${server.addedLatency || 0}">
            <span class="latency-val">${server.addedLatency || 0}ms</span>
        `;
        div.appendChild(latencyControl);

        serverControlsDiv.appendChild(div);
    });

    // Bind events
    document.querySelectorAll('.server-toggle').forEach(el => {
        el.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const isDown = !e.target.checked;
            worker.postMessage({ type: 'updateServer', payload: { id, isDown } });
            log(`Server ${id+1} turned ${isDown ? 'OFF' : 'ON'}`);
        });
    });

    document.querySelectorAll('.latency-slider').forEach(el => {
        el.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const val = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = val + 'ms';
            worker.postMessage({ type: 'updateServer', payload: { id, addedLatency: val } });
        });
    });
}

// Worker Communication
worker.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'update') {
        serverData = payload.servers;
        draw(payload.servers);
        renderServerControls(payload.servers);

        totalRequestsEl.textContent = payload.stats.totalRequests;
        avgLatencyEl.textContent = payload.stats.avgLatency.toFixed(1) + ' ms';
        errorRateEl.textContent = payload.stats.errorRate.toFixed(2) + '%';
    }
};

// UI Controls
startBtn.addEventListener('click', () => {
    worker.postMessage({
        type: 'start',
        payload: {
            algorithm: algorithmSelect.value,
            requestRate: parseInt(requestRateInput.value)
        }
    });
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    log('Simulation started');
});

stopBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'stop' });
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    log('Simulation stopped');
});

resetBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'reset' });
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    serverControlsDiv.innerHTML = ''; // Re-render controls
    log('Reset simulation');
});

algorithmSelect.addEventListener('change', () => {
    worker.postMessage({
        type: 'updateConfig',
        payload: { algorithm: algorithmSelect.value }
    });
    log(`Switched to algorithm: ${algorithmSelect.options[algorithmSelect.selectedIndex].text}`);
});

requestRateInput.addEventListener('input', (e) => {
    document.getElementById('requestRateVal').textContent = e.target.value;
    worker.postMessage({
        type: 'updateConfig',
        payload: { requestRate: parseInt(e.target.value) }
    });
});
