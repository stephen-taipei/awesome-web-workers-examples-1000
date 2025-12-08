const quotaInput = document.getElementById('quotaInput');
const setQuotaBtn = document.getElementById('setQuotaBtn');
const performOpBtn = document.getElementById('performOpBtn');
const resetBtn = document.getElementById('resetBtn');
const opCountDisplay = document.getElementById('opCount');
const quotaRemainingDisplay = document.getElementById('quotaRemaining');
const statusDisplay = document.getElementById('status');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'quotaUpdated') {
        quotaRemainingDisplay.textContent = payload.remaining;
        statusDisplay.textContent = 'Quota updated';
        statusDisplay.className = '';
        performOpBtn.disabled = false;
    } else if (type === 'operationSuccess') {
        opCountDisplay.textContent = payload.count;
        quotaRemainingDisplay.textContent = payload.remaining;
        statusDisplay.textContent = 'Operation successful';
        statusDisplay.className = '';
    } else if (type === 'quotaExceeded') {
        statusDisplay.textContent = 'Quota exceeded! Operation denied.';
        statusDisplay.className = 'error';
        performOpBtn.disabled = true;
    } else if (type === 'reset') {
        opCountDisplay.textContent = 0;
        quotaRemainingDisplay.textContent = payload.remaining;
        statusDisplay.textContent = 'Reset complete';
        statusDisplay.className = '';
        performOpBtn.disabled = false;
        quotaInput.value = payload.remaining;
    }
};

setQuotaBtn.addEventListener('click', () => {
    const quota = parseInt(quotaInput.value, 10);
    if (quota > 0) {
        worker.postMessage({ type: 'setQuota', quota: quota });
    }
});

performOpBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'performOperation' });
});

resetBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'reset' });
});
