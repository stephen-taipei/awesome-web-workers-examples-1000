const runBtn = document.getElementById('runBenchmarkBtn');
const hwConcurrencySpan = document.getElementById('hwConcurrency');
const taskSizeSelect = document.getElementById('taskSize');
const resultsArea = document.getElementById('resultsArea');
const chartCanvas = document.getElementById('perfChart');

// Detect hardware concurrency
const maxWorkers = navigator.hardwareConcurrency || 4;
hwConcurrencySpan.textContent = maxWorkers;

const workerConfigs = [1, 2, 4, 8, 16].filter(n => n <= maxWorkers * 2); // Test up to reasonable limit
// Ensure maxWorkers is included if not already
if (!workerConfigs.includes(maxWorkers)) {
    workerConfigs.push(maxWorkers);
    workerConfigs.sort((a,b) => a-b);
}

let results = [];

runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    taskSizeSelect.disabled = true;
    results = [];
    resultsArea.innerHTML = '';
    chartCanvas.style.display = 'none';

    const range = parseInt(taskSizeSelect.value);

    for (const count of workerConfigs) {
        await runTest(count, range);
    }

    drawChart();
    runBtn.disabled = false;
    taskSizeSelect.disabled = false;
});

function runTest(workerCount, range) {
    return new Promise(resolve => {
        // Create UI row
        const row = document.createElement('div');
        row.className = 'result-item';
        row.style.marginBottom = '0.5rem';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <span>${workerCount} Worker(s)</span>
                <span class="status">執行中...</span>
            </div>
            <div class="progress-bar-container" style="height:4px; margin-top:5px;">
                <div class="progress-bar" style="width:0%"></div>
            </div>
        `;
        resultsArea.appendChild(row);

        const startTime = performance.now();
        let completedWorkers = 0;
        const workers = [];
        const chunkSize = Math.ceil(range / workerCount);

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker('worker.js');
            const start = i * chunkSize + 1; // Start from 1 is fine, primes start at 2
            const end = Math.min((i + 1) * chunkSize, range);

            worker.onmessage = (e) => {
                if (e.data.type === 'complete') {
                    completedWorkers++;
                    worker.terminate();

                    const progress = (completedWorkers / workerCount) * 100;
                    row.querySelector('.progress-bar').style.width = `${progress}%`;

                    if (completedWorkers === workerCount) {
                        const totalTime = performance.now() - startTime;
                        const statusEl = row.querySelector('.status');
                        statusEl.textContent = `${totalTime.toFixed(0)} ms`;
                        statusEl.style.color = '#10b981';

                        results.push({ workers: workerCount, time: totalTime });
                        resolve();
                    }
                }
            };

            worker.postMessage({ start, end });
            workers.push(worker);
        }
    });
}

function drawChart() {
    chartCanvas.style.display = 'block';
    chartCanvas.width = chartCanvas.offsetWidth;
    chartCanvas.height = chartCanvas.offsetHeight;
    const ctx = chartCanvas.getContext('2d');
    const width = chartCanvas.width;
    const height = chartCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // Bar chart
    const padding = 40;
    const barWidth = (width - padding * 2) / results.length * 0.6;
    const gap = (width - padding * 2) / results.length * 0.4;

    const maxTime = Math.max(...results.map(r => r.time));

    results.forEach((res, i) => {
        const h = (res.time / maxTime) * (height - padding * 2);
        const x = padding + i * (barWidth + gap);
        const y = height - padding - h;

        // Bar
        const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, h);

        // Text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '12px Arial';
        ctx.fillText(`${res.time.toFixed(0)}ms`, x + barWidth/2, y - 5);

        ctx.fillStyle = '#a7f3d0';
        ctx.fillText(`${res.workers}W`, x + barWidth/2, height - padding + 15);

        // Speedup factor
        if (i > 0) {
            const speedup = results[0].time / res.time;
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`${speedup.toFixed(1)}x`, x + barWidth/2, y - 20);
        }
    });

    // Axis lines
    ctx.strokeStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding); // X
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding); // Y
    ctx.stroke();
}
