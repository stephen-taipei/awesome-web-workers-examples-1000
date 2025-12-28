/**
 * #640 SIMD-like Parallelism
 */
const SIZE = 1000000;
const WORKERS = 4;
let workers = [], results = [];

document.getElementById('start-btn').addEventListener('click', parallel);
document.getElementById('seq-btn').addEventListener('click', sequential);

function parallel() {
    const a = new Float32Array(SIZE).map(() => Math.random());
    const b = new Float32Array(SIZE).map(() => Math.random());
    const chunkSize = SIZE / WORKERS;

    workers.forEach(w => w.terminate());
    workers = [];
    results = [];
    const startTime = performance.now();

    for (let i = 0; i < WORKERS; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            results[i] = e.data.result;
            if (results.filter(r => r).length === WORKERS) {
                const time = performance.now() - startTime;
                showResult('Parallel', time, SIZE);
            }
        };
        const start = i * chunkSize;
        const end = start + chunkSize;
        worker.postMessage({
            a: a.slice(start, end),
            b: b.slice(start, end)
        });
        workers.push(worker);
    }
}

function sequential() {
    const a = new Float32Array(SIZE).map(() => Math.random());
    const b = new Float32Array(SIZE).map(() => Math.random());
    const c = new Float32Array(SIZE);

    const startTime = performance.now();
    for (let i = 0; i < SIZE; i++) {
        c[i] = a[i] + b[i];
    }
    const time = performance.now() - startTime;
    showResult('Sequential', time, SIZE);
}

function showResult(mode, time, size) {
    document.getElementById('results').innerHTML = `
        <div class="stat-item"><span class="stat-label">Mode:</span><span class="stat-value">${mode}</span></div>
        <div class="stat-item"><span class="stat-label">Vector Size:</span><span class="stat-value">${size.toLocaleString()}</span></div>
        <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${time.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Throughput:</span><span class="stat-value">${(size / time * 1000).toExponential(2)} ops/s</span></div>
    `;
}
