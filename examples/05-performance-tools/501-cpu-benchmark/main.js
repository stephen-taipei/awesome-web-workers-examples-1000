const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const durationInput = document.getElementById('duration');
const threadsSelect = document.getElementById('threads');
const outputText = document.getElementById('outputText');
const progressBar = document.getElementById('progressBar');
const primeCount = document.getElementById('primeCount');
const opsSec = document.getElementById('opsSec');

let workers = [];
let results = [];
let startTime = 0;
let timer = null;

startBtn.addEventListener('click', () => {
    const duration = parseInt(durationInput.value) * 1000;
    const numThreads = parseInt(threadsSelect.value);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    outputText.textContent = `Running benchmark on ${numThreads} threads for ${duration/1000}s...`;
    progressBar.style.width = '0%';
    primeCount.textContent = '-';
    opsSec.textContent = '-';

    workers.forEach(w => w.terminate()); // Ensure clean state
    workers = [];
    results = [];
    let completedWorkers = 0;

    startTime = performance.now();

    // Progress bar animation
    let elapsed = 0;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        elapsed += 100;
        const pct = Math.min(100, (elapsed / duration) * 100);
        progressBar.style.width = `${pct}%`;

        if (elapsed >= duration) {
            clearInterval(timer);
            // Time is up, workers should stop themselves via duration check or we stop them
            // We'll rely on worker's duration logic for cleaner finish, but fail-safe here
            // Wait for workers to report back
        }
    }, 100);

    for (let i = 0; i < numThreads; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            const { count } = e.data;
            results.push(count);
            worker.terminate();
            completedWorkers++;

            if (completedWorkers === numThreads) {
                finish();
            }
        };
        worker.postMessage({ command: 'start', duration });
        workers.push(worker);
    }
});

stopBtn.addEventListener('click', () => {
    clearInterval(timer);
    progressBar.style.width = '100%';

    // Forcefully stop all workers
    workers.forEach(w => w.terminate());

    // Since we terminated them, they won't report back.
    // We should display what we have or just say stopped.
    // Actually, forcing stop makes results invalid or partial.
    // Let's just reset UI and show stopped message.

    workers = [];
    startBtn.disabled = false;
    stopBtn.disabled = true;
    outputText.textContent += '\n(Benchmark stopped by user)';
});

function finish() {
    if (workers.length === 0) return; // Already stopped

    const totalPrimes = results.reduce((a, b) => a + b, 0);
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;

    primeCount.textContent = totalPrimes.toLocaleString();
    opsSec.textContent = Math.floor(totalPrimes / totalTime).toLocaleString();

    outputText.textContent = `Done!\nFound ${totalPrimes} primes in ${totalTime.toFixed(2)}s.\nIndividual threads: ${results.join(', ')}`;

    startBtn.disabled = false;
    stopBtn.disabled = true;
    workers = [];
}
