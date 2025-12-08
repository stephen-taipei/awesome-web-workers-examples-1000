const requestBtn = document.getElementById('requestBtn');
const burstBtn = document.getElementById('burstBtn');
const updateConfigBtn = document.getElementById('updateConfigBtn');
const capacityInput = document.getElementById('capacity');
const rateInput = document.getElementById('rate');
const currentTokenCountDisplay = document.getElementById('currentTokenCount');
const statusTextDisplay = document.getElementById('statusText');
const bucketDiv = document.getElementById('bucket');
const logList = document.getElementById('logList');
const generatedTokenDiv = document.getElementById('generatedToken');

const worker = new Worker('worker.js');

updateConfig();

requestBtn.addEventListener('click', () => sendRequest(1));
burstBtn.addEventListener('click', () => sendRequest(5));
updateConfigBtn.addEventListener('click', updateConfig);

worker.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'STATUS_UPDATE':
            updateVisualization(payload);
            break;
        case 'EVENT_LOG':
            addLog(payload);
            break;
        case 'TOKEN_GENERATED':
            animateTokenGeneration();
            break;
    }
};

function sendRequest(tokensNeeded) {
    worker.postMessage({ type: 'REQUEST', tokensNeeded: tokensNeeded });
}

function updateConfig() {
    const capacity = parseInt(capacityInput.value, 10);
    const rate = parseFloat(rateInput.value);

    if (capacity <= 0 || rate <= 0) {
        alert('請輸入有效數值');
        return;
    }

    worker.postMessage({
        type: 'CONFIG',
        payload: { capacity, rate }
    });
}

function updateVisualization(state) {
    const { tokens, capacity } = state;

    currentTokenCountDisplay.textContent = Math.floor(tokens);

    // Update bucket visualization
    // We want to show discrete tokens if possible, or just a fill level
    // Here we show discrete tokens up to a limit to keep DOM light, or just simplified

    // Clear bucket
    bucketDiv.innerHTML = '';

    const count = Math.floor(tokens);
    for (let i = 0; i < count; i++) {
        const token = document.createElement('div');
        token.className = 'token';
        token.textContent = '$';
        bucketDiv.appendChild(token);
    }

    if (count < tokens) {
         // Partial token visualization if we wanted, but let's stick to floor for visual clarity
    }
}

function animateTokenGeneration() {
    generatedTokenDiv.classList.remove('hidden');
    generatedTokenDiv.classList.add('animate-drop');

    setTimeout(() => {
        generatedTokenDiv.classList.remove('animate-drop');
        generatedTokenDiv.classList.add('hidden');
    }, 500);
}

function addLog(data) {
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString();

    li.className = data.type; // token-gen, allow, deny

    let message = '';
    if (data.type === 'allow') {
        message = `✅ 請求通過 (消耗 ${data.tokens} 令牌)`;
        statusTextDisplay.textContent = "請求通過";
        statusTextDisplay.style.color = "green";
        setTimeout(() => { statusTextDisplay.textContent = "就緒"; statusTextDisplay.style.color = "#333"; }, 500);
    } else if (data.type === 'deny') {
        message = `⛔ 令牌不足，請求拒絕 (需 ${data.tokens} 令牌)`;
        statusTextDisplay.textContent = "請求拒絕";
        statusTextDisplay.style.color = "red";
        setTimeout(() => { statusTextDisplay.textContent = "就緒"; statusTextDisplay.style.color = "#333"; }, 500);
    } else if (data.type === 'token-gen') {
        message = `➕ 生成令牌`;
    }

    if (message) {
        li.innerHTML = `<span style="color:#999">[${time}]</span> ${message}`;
        logList.insertBefore(li, logList.firstChild);

        if (logList.children.length > 20) {
            logList.removeChild(logList.lastChild);
        }
    }
}
