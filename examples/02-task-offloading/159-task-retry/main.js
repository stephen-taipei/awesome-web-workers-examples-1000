const startBtn = document.getElementById('startBtn');
const failureRateInput = document.getElementById('failureRate');
const maxRetriesInput = document.getElementById('maxRetries');
const statusDiv = document.getElementById('status');
const logDiv = document.getElementById('log');

function log(message, type = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function runTaskWithRetry(failureRate, maxRetries) {
    let attempt = 0;

    const execute = () => {
        return new Promise((resolve, reject) => {
            attempt++;
            const worker = new Worker('worker.js');

            worker.onmessage = (e) => {
                worker.terminate();
                resolve(e.data);
            };

            worker.onerror = (e) => {
                e.preventDefault(); // Prevent default console error
                worker.terminate();
                reject(new Error(e.message));
            };

            worker.postMessage({ failureRate });
        });
    };

    const retry = async () => {
        try {
            log(`Attempt ${attempt} starting...`);
            const result = await execute();
            return result;
        } catch (error) {
            log(`Attempt ${attempt} failed: ${error.message}`, 'error');

            if (attempt <= maxRetries) {
                const delay = Math.pow(2, attempt) * 100; // Exponential backoff: 200, 400, 800...
                log(`Retrying in ${delay}ms...`, 'retry');
                await new Promise(r => setTimeout(r, delay));
                return retry();
            } else {
                throw new Error(`Failed after ${maxRetries} retries.`);
            }
        }
    };

    return retry();
}

startBtn.addEventListener('click', async () => {
    const failureRate = parseFloat(failureRateInput.value);
    const maxRetries = parseInt(maxRetriesInput.value, 10);

    startBtn.disabled = true;
    logDiv.innerHTML = '';
    statusDiv.textContent = 'Running...';

    try {
        const data = await runTaskWithRetry(failureRate, maxRetries);
        log(data.result, 'success');
        statusDiv.textContent = 'Success';
    } catch (error) {
        log(error.message, 'error');
        statusDiv.textContent = 'Failed';
    } finally {
        startBtn.disabled = false;
    }
});
