const startBtn = document.getElementById('startBtn');
const taskDurationInput = document.getElementById('taskDuration');
const timeoutLimitInput = document.getElementById('timeoutLimit');
const statusDiv = document.getElementById('status');
const resultDiv = document.getElementById('result');

let worker;

function createWorker() {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');
}

function runTaskWithTimeout(duration, timeout) {
    return new Promise((resolve, reject) => {
        createWorker();

        const timer = setTimeout(() => {
            worker.terminate(); // Kill the worker
            reject(new Error(`Task timed out after ${timeout}ms`));
        }, timeout);

        worker.onmessage = (e) => {
            clearTimeout(timer);
            resolve(e.data);
        };

        worker.postMessage({ duration });
    });
}

startBtn.addEventListener('click', async () => {
    const duration = parseInt(taskDurationInput.value, 10);
    const timeout = parseInt(timeoutLimitInput.value, 10);

    startBtn.disabled = true;
    statusDiv.textContent = 'Task running...';
    resultDiv.className = 'result';
    resultDiv.style.display = 'none';

    try {
        const data = await runTaskWithTimeout(duration, timeout);
        resultDiv.textContent = data.result;
        resultDiv.style.display = 'block'; // Make sure it is visible
        resultDiv.classList.add('success');
        statusDiv.textContent = 'Completed';
    } catch (error) {
        resultDiv.textContent = error.message;
        resultDiv.style.display = 'block'; // Make sure it is visible
        resultDiv.classList.add('error');
        statusDiv.textContent = 'Failed';
    } finally {
        startBtn.disabled = false;
    }
});
