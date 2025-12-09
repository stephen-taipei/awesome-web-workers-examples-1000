// Parallel Performance Analysis - Main Thread

const taskTypeSelect = document.getElementById('taskType');
const workloadSizeSelect = document.getElementById('workloadSize');
const maxWorkersInput = document.getElementById('maxWorkers');
const iterationsInput = document.getElementById('iterations');

const analyzeBtn = document.getElementById('analyzeBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const parallelFractionEl = document.getElementById('parallelFraction');
const maxSpeedupEl = document.getElementById('maxSpeedup');
const serialTimeEl = document.getElementById('serialTime');
const bestParallelTimeEl = document.getElementById('bestParallelTime');
const achievedSpeedupEl = document.getElementById('achievedSpeedup');
const optimalWorkersEl = document.getElementById('optimalWorkers');
const peakEfficiencyEl = document.getElementById('peakEfficiency');
const karpFlattEl = document.getElementById('karpFlatt');
const detailedResultsEl = document.getElementById('detailedResults');
const recommendationsEl = document.getElementById('recommendations');

const speedupCanvas = document.getElementById('speedupCanvas');
const speedupCtx = speedupCanvas.getContext('2d');
const efficiencyCanvas = document.getElementById('efficiencyCanvas');
const efficiencyCtx = efficiencyCanvas.getContext('2d');

let analysisResults = [];

function getWorkloadOperations(size) {
    switch (size) {
        case 'small': return 1000000;
        case 'medium': return 5000000;
        case 'large': return 20000000;
        default: return 5000000;
    }
}

async function runSequentialTest(taskType, operations, iterations) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
        const worker = new Worker('worker.js');

        const time = await new Promise((resolve) => {
            worker.onmessage = (e) => {
                worker.terminate();
                resolve(e.data.executionTime);
            };

            worker.postMessage({
                type: 'sequential',
                taskType,
                operations
            });
        });

        times.push(time);
    }

    // Return median time
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)];
}

async function runParallelTest(taskType, operations, workerCount, iterations) {
    const times = [];

    for (let iter = 0; iter < iterations; iter++) {
        const workers = [];
        const chunkSize = Math.ceil(operations / workerCount);
        const startTime = performance.now();

        const promises = [];

        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker('worker.js');
            workers.push(worker);

            promises.push(new Promise((resolve) => {
                worker.onmessage = (e) => {
                    resolve(e.data);
                };

                worker.postMessage({
                    type: 'parallel',
                    taskType,
                    operations: chunkSize,
                    workerId: i
                });
            }));
        }

        await Promise.all(promises);
        const totalTime = performance.now() - startTime;

        workers.forEach(w => w.terminate());
        times.push(totalTime);
    }

    // Return median time
    times.sort((a, b) => a - b);
    return times[Math.floor(times.length / 2)];
}

function calculateAmdahlSpeedup(P, n) {
    return 1 / ((1 - P) + P / n);
}

function estimateParallelFraction(serialTime, parallelResults) {
    // Use least squares to estimate P from actual speedups
    // Speedup = 1 / ((1-P) + P/n)
    // We solve for P that best fits the data

    let bestP = 0.5;
    let bestError = Infinity;

    for (let P = 0; P <= 1; P += 0.01) {
        let error = 0;
        for (const result of parallelResults) {
            const expectedSpeedup = calculateAmdahlSpeedup(P, result.workers);
            const actualSpeedup = serialTime / result.time;
            error += Math.pow(expectedSpeedup - actualSpeedup, 2);
        }

        if (error < bestError) {
            bestError = error;
            bestP = P;
        }
    }

    return bestP;
}

function calculateKarpFlattMetric(speedup, n) {
    // e = (1/S - 1/n) / (1 - 1/n)
    if (n <= 1 || speedup <= 0) return 0;
    return (1 / speedup - 1 / n) / (1 - 1 / n);
}

function drawSpeedupChart(results, serialTime, P) {
    const w = speedupCanvas.width;
    const h = speedupCanvas.height;
    const padding = 50;

    speedupCtx.fillStyle = '#080f08';
    speedupCtx.fillRect(0, 0, w, h);

    if (results.length === 0) return;

    const maxWorkers = Math.max(...results.map(r => r.workers));
    const maxSpeedup = Math.max(...results.map(r => r.speedup), calculateAmdahlSpeedup(P, maxWorkers), maxWorkers);

    const xScale = (w - padding * 2) / maxWorkers;
    const yScale = (h - padding * 2) / (maxSpeedup * 1.1);

    // Grid
    speedupCtx.strokeStyle = '#1a3a2a';
    speedupCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = h - padding - i * (h - padding * 2) / 5;
        speedupCtx.beginPath();
        speedupCtx.moveTo(padding, y);
        speedupCtx.lineTo(w - padding, y);
        speedupCtx.stroke();

        speedupCtx.fillStyle = '#4a7a5a';
        speedupCtx.font = '10px monospace';
        speedupCtx.textAlign = 'right';
        speedupCtx.fillText(`${(i * maxSpeedup * 1.1 / 5).toFixed(1)}x`, padding - 5, y + 3);
    }

    // X-axis labels
    speedupCtx.textAlign = 'center';
    for (let i = 1; i <= maxWorkers; i++) {
        const x = padding + i * xScale;
        speedupCtx.fillText(i.toString(), x, h - padding + 15);
    }

    // Linear speedup line (ideal)
    speedupCtx.strokeStyle = '#4a7a5a';
    speedupCtx.lineWidth = 1;
    speedupCtx.setLineDash([5, 5]);
    speedupCtx.beginPath();
    speedupCtx.moveTo(padding + xScale, h - padding - 1 * yScale);
    speedupCtx.lineTo(padding + maxWorkers * xScale, h - padding - maxWorkers * yScale);
    speedupCtx.stroke();
    speedupCtx.setLineDash([]);

    // Amdahl's Law prediction
    speedupCtx.strokeStyle = '#f59e0b';
    speedupCtx.lineWidth = 2;
    speedupCtx.beginPath();
    for (let n = 1; n <= maxWorkers; n += 0.1) {
        const speedup = calculateAmdahlSpeedup(P, n);
        const x = padding + n * xScale;
        const y = h - padding - speedup * yScale;
        if (n === 1) speedupCtx.moveTo(x, y);
        else speedupCtx.lineTo(x, y);
    }
    speedupCtx.stroke();

    // Actual speedup points
    speedupCtx.fillStyle = '#10b981';
    results.forEach(r => {
        const x = padding + r.workers * xScale;
        const y = h - padding - r.speedup * yScale;

        speedupCtx.beginPath();
        speedupCtx.arc(x, y, 6, 0, Math.PI * 2);
        speedupCtx.fill();

        // Value label
        speedupCtx.fillStyle = '#fff';
        speedupCtx.font = '9px monospace';
        speedupCtx.textAlign = 'center';
        speedupCtx.fillText(`${r.speedup.toFixed(2)}x`, x, y - 10);
        speedupCtx.fillStyle = '#10b981';
    });

    // Connect actual points
    speedupCtx.strokeStyle = '#10b981';
    speedupCtx.lineWidth = 2;
    speedupCtx.beginPath();
    results.forEach((r, i) => {
        const x = padding + r.workers * xScale;
        const y = h - padding - r.speedup * yScale;
        if (i === 0) speedupCtx.moveTo(x, y);
        else speedupCtx.lineTo(x, y);
    });
    speedupCtx.stroke();

    // Legend
    speedupCtx.font = '10px sans-serif';

    speedupCtx.fillStyle = '#10b981';
    speedupCtx.fillRect(w - 150, 15, 12, 12);
    speedupCtx.fillText('Actual', w - 132, 24);

    speedupCtx.fillStyle = '#f59e0b';
    speedupCtx.fillRect(w - 150, 32, 12, 12);
    speedupCtx.fillText('Amdahl\'s Law', w - 132, 41);

    speedupCtx.fillStyle = '#4a7a5a';
    speedupCtx.fillRect(w - 150, 49, 12, 12);
    speedupCtx.fillText('Linear (Ideal)', w - 132, 58);

    // Axes labels
    speedupCtx.fillStyle = '#34d399';
    speedupCtx.font = '11px sans-serif';
    speedupCtx.textAlign = 'center';
    speedupCtx.fillText('Number of Workers', w / 2, h - 5);

    speedupCtx.save();
    speedupCtx.translate(15, h / 2);
    speedupCtx.rotate(-Math.PI / 2);
    speedupCtx.fillText('Speedup', 0, 0);
    speedupCtx.restore();
}

function drawEfficiencyChart(results) {
    const w = efficiencyCanvas.width;
    const h = efficiencyCanvas.height;
    const padding = 50;

    efficiencyCtx.fillStyle = '#080f08';
    efficiencyCtx.fillRect(0, 0, w, h);

    if (results.length === 0) return;

    const maxWorkers = Math.max(...results.map(r => r.workers));

    const xScale = (w - padding * 2) / maxWorkers;
    const yScale = (h - padding * 2) / 100;

    // Grid
    efficiencyCtx.strokeStyle = '#1a3a2a';
    efficiencyCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = h - padding - i * 20 * yScale;
        efficiencyCtx.beginPath();
        efficiencyCtx.moveTo(padding, y);
        efficiencyCtx.lineTo(w - padding, y);
        efficiencyCtx.stroke();

        efficiencyCtx.fillStyle = '#4a7a5a';
        efficiencyCtx.font = '10px monospace';
        efficiencyCtx.textAlign = 'right';
        efficiencyCtx.fillText(`${i * 20}%`, padding - 5, y + 3);
    }

    // X-axis labels
    efficiencyCtx.textAlign = 'center';
    for (let i = 1; i <= maxWorkers; i++) {
        const x = padding + i * xScale;
        efficiencyCtx.fillText(i.toString(), x, h - padding + 15);
    }

    // Efficiency bars
    const barWidth = xScale * 0.6;
    results.forEach(r => {
        const x = padding + r.workers * xScale - barWidth / 2;
        const barHeight = r.efficiency * yScale;

        // Color based on efficiency
        const hue = Math.min(120, r.efficiency * 1.2);
        efficiencyCtx.fillStyle = `hsl(${hue}, 70%, 45%)`;

        efficiencyCtx.fillRect(x, h - padding - barHeight, barWidth, barHeight);

        // Value label
        efficiencyCtx.fillStyle = '#fff';
        efficiencyCtx.font = '9px monospace';
        efficiencyCtx.textAlign = 'center';
        efficiencyCtx.fillText(`${r.efficiency.toFixed(0)}%`, x + barWidth / 2, h - padding - barHeight - 5);
    });

    // Axes labels
    efficiencyCtx.fillStyle = '#34d399';
    efficiencyCtx.font = '11px sans-serif';
    efficiencyCtx.textAlign = 'center';
    efficiencyCtx.fillText('Number of Workers', w / 2, h - 5);
}

function displayDetailedResults(results) {
    let html = `
        <table>
            <tr>
                <th>Workers</th>
                <th>Time (ms)</th>
                <th>Speedup</th>
                <th>Efficiency</th>
                <th>Karp-Flatt</th>
            </tr>
    `;

    const optimalWorkers = results.reduce((best, r) => r.speedup > best.speedup ? r : best).workers;

    results.forEach(r => {
        const isOptimal = r.workers === optimalWorkers;
        html += `
            <tr class="${isOptimal ? 'optimal-row' : ''}">
                <td>${r.workers}</td>
                <td>${r.time.toFixed(2)}</td>
                <td>${r.speedup.toFixed(3)}x</td>
                <td>${r.efficiency.toFixed(1)}%</td>
                <td>${r.karpFlatt.toFixed(4)}</td>
            </tr>
        `;
    });

    html += '</table>';
    detailedResultsEl.innerHTML = html;
}

function generateRecommendations(results, P, serialTime) {
    const recommendations = [];
    const optimal = results.reduce((best, r) => r.speedup > best.speedup ? r : best);
    const maxTheoretical = 1 / (1 - P);

    // Analyze the results
    const efficiency80 = results.find(r => r.efficiency >= 80);
    const lastResult = results[results.length - 1];
    const diminishingReturns = results.find((r, i) => {
        if (i === 0) return false;
        const prev = results[i - 1];
        return (r.speedup - prev.speedup) < (prev.speedup - (results[i - 2]?.speedup || 0)) * 0.5;
    });

    // Classification
    let classification = 'good';
    if (P < 0.7) classification = 'warning';
    if (P > 0.9 && optimal.efficiency > 70) classification = 'good';

    recommendations.push({
        type: 'info',
        title: 'Parallelization Analysis',
        items: [
            `Your workload is ${(P * 100).toFixed(1)}% parallelizable`,
            `Maximum theoretical speedup: ${maxTheoretical.toFixed(2)}x`,
            `Best achieved speedup: ${optimal.speedup.toFixed(2)}x (${((optimal.speedup / maxTheoretical) * 100).toFixed(0)}% of theoretical)`
        ]
    });

    recommendations.push({
        type: optimal.workers <= 4 ? 'good' : 'warning',
        title: 'Optimal Configuration',
        items: [
            `Optimal worker count: ${optimal.workers} workers`,
            `At this point: ${optimal.efficiency.toFixed(1)}% efficiency`,
            efficiency80 ? `80%+ efficiency maintained up to ${efficiency80.workers} workers` : 'Efficiency drops below 80% with parallel execution'
        ]
    });

    if (diminishingReturns) {
        recommendations.push({
            type: 'warning',
            title: 'Diminishing Returns',
            items: [
                `Significant diminishing returns observed after ${diminishingReturns.workers - 1} workers`,
                `Adding more workers beyond this point has limited benefit`,
                `Consider using ${Math.min(optimal.workers, diminishingReturns.workers - 1)} workers for best efficiency`
            ]
        });
    }

    if (P < 0.8) {
        recommendations.push({
            type: 'warning',
            title: 'Parallelization Opportunity',
            items: [
                `${((1 - P) * 100).toFixed(1)}% of your workload is serial`,
                'Consider restructuring code to reduce serial portions',
                'Look for sequential dependencies that could be parallelized'
            ]
        });
    }

    // Render recommendations
    recommendationsEl.innerHTML = recommendations.map(rec => `
        <div class="recommendations recommendation-${rec.type}">
            <h4>${rec.title}</h4>
            <ul>
                ${rec.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

async function analyze() {
    const taskType = taskTypeSelect.value;
    const workloadSize = workloadSizeSelect.value;
    const maxWorkers = parseInt(maxWorkersInput.value);
    const iterations = parseInt(iterationsInput.value);

    const operations = getWorkloadOperations(workloadSize);

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    analysisResults = [];

    // Run sequential baseline
    progressBar.style.width = '5%';
    progressText.textContent = 'Running sequential baseline...';
    const serialTime = await runSequentialTest(taskType, operations, iterations);

    const results = [];

    // Test each worker count
    for (let workers = 1; workers <= maxWorkers; workers++) {
        const progress = 10 + (workers / maxWorkers) * 85;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Testing with ${workers} worker(s)...`;

        const time = await runParallelTest(taskType, operations, workers, iterations);
        const speedup = serialTime / time;
        const efficiency = (speedup / workers) * 100;
        const karpFlatt = calculateKarpFlattMetric(speedup, workers);

        results.push({
            workers,
            time,
            speedup,
            efficiency,
            karpFlatt
        });
    }

    // Estimate parallel fraction
    const P = estimateParallelFraction(serialTime, results);
    const maxTheoreticalSpeedup = 1 / (1 - P);

    // Find optimal
    const optimal = results.reduce((best, r) => r.speedup > best.speedup ? r : best);

    progressBar.style.width = '100%';
    progressText.textContent = 'Analysis complete!';

    setTimeout(() => {
        progressContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        // Display results
        parallelFractionEl.textContent = `${(P * 100).toFixed(1)}%`;
        maxSpeedupEl.textContent = `${maxTheoreticalSpeedup.toFixed(2)}x`;
        serialTimeEl.textContent = `${serialTime.toFixed(2)} ms`;
        bestParallelTimeEl.textContent = `${optimal.time.toFixed(2)} ms`;
        achievedSpeedupEl.textContent = `${optimal.speedup.toFixed(2)}x`;
        optimalWorkersEl.textContent = optimal.workers;
        peakEfficiencyEl.textContent = `${optimal.efficiency.toFixed(1)}%`;
        karpFlattEl.textContent = optimal.karpFlatt.toFixed(4);

        // Draw charts
        drawSpeedupChart(results, serialTime, P);
        drawEfficiencyChart(results);

        // Detailed results table
        displayDetailedResults(results);

        // Recommendations
        generateRecommendations(results, P, serialTime);

        analysisResults = results;
    }, 300);
}

function reset() {
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    analysisResults = [];

    // Clear canvases
    speedupCtx.fillStyle = '#080f08';
    speedupCtx.fillRect(0, 0, speedupCanvas.width, speedupCanvas.height);
    speedupCtx.fillStyle = '#4a7a5a';
    speedupCtx.font = '14px sans-serif';
    speedupCtx.textAlign = 'center';
    speedupCtx.fillText('Run analysis to see speedup chart', speedupCanvas.width / 2, speedupCanvas.height / 2);

    efficiencyCtx.fillStyle = '#080f08';
    efficiencyCtx.fillRect(0, 0, efficiencyCanvas.width, efficiencyCanvas.height);
}

analyzeBtn.addEventListener('click', analyze);
resetBtn.addEventListener('click', reset);

// Initial state
reset();
