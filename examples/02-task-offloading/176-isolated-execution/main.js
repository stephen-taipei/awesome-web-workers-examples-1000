/**
 * Worker 隔離執行 - 主程式
 */

// DOM 元素
const codeInput = document.getElementById('code-input');
const timeoutInput = document.getElementById('timeout-input');
const whitelistInput = document.getElementById('whitelist-input');
const runBtn = document.getElementById('run-btn');
const terminateBtn = document.getElementById('terminate-btn');
const clearBtn = document.getElementById('clear-btn');
const consoleOutput = document.getElementById('console-output');
const workerStatus = document.getElementById('worker-status');

// Worker 實例
let sandboxWorker = null;
let executionTimeout = null;

// 更新狀態顯示
function updateStatus(status) {
    workerStatus.className = 'status-badge';
    switch (status) {
        case 'running':
            workerStatus.classList.add('status-running');
            workerStatus.textContent = '執行中';
            runBtn.disabled = true;
            terminateBtn.disabled = false;
            break;
        case 'idle':
            workerStatus.classList.add('status-idle');
            workerStatus.textContent = '閒置中';
            runBtn.disabled = false;
            terminateBtn.disabled = true;
            break;
        case 'terminated':
            workerStatus.classList.add('status-terminated');
            workerStatus.textContent = '已終止';
            runBtn.disabled = false;
            terminateBtn.disabled = true;
            break;
    }
}

// 輸出日誌到控制台介面
function log(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// 建立並配置 Worker
function createWorker() {
    if (sandboxWorker) {
        sandboxWorker.terminate();
    }

    sandboxWorker = new Worker('worker.js');

    sandboxWorker.onmessage = function(e) {
        const { type, content } = e.data;

        switch (type) {
            case 'log':
                log(content, 'info');
                break;
            case 'error':
                log(content, 'error');
                break;
            case 'warn':
                log(content, 'warn');
                break;
            case 'complete':
                log(`執行完成。耗時: ${content}ms`, 'info');
                finishExecution();
                break;
        }
    };

    sandboxWorker.onerror = function(e) {
        log(`Worker 錯誤: ${e.message}`, 'error');
        finishExecution();
    };
}

// 結束執行
function finishExecution() {
    if (executionTimeout) {
        clearTimeout(executionTimeout);
        executionTimeout = null;
    }
    updateStatus('idle');
}

// 強制終止 Worker
function terminateWorker(reason = '使用者強制終止') {
    if (sandboxWorker) {
        sandboxWorker.terminate();
        sandboxWorker = null;
    }
    log(`執行已停止: ${reason}`, 'error');
    finishExecution();
    updateStatus('terminated');
}

// 執行程式碼
function runCode() {
    const code = codeInput.value;
    const timeout = parseInt(timeoutInput.value, 10) || 1000;
    const whitelist = whitelistInput.value.split(',').map(s => s.trim()).filter(s => s);

    if (!code.trim()) {
        log('請輸入程式碼', 'warn');
        return;
    }

    createWorker();
    updateStatus('running');
    log('開始執行...', 'info');

    // 發送程式碼到 Worker
    sandboxWorker.postMessage({
        type: 'execute',
        code: code,
        whitelist: whitelist
    });

    // 設定超時
    executionTimeout = setTimeout(() => {
        terminateWorker(`執行超時 (${timeout}ms)`);
    }, timeout);
}

// 事件監聽
runBtn.addEventListener('click', runCode);
terminateBtn.addEventListener('click', () => terminateWorker());
clearBtn.addEventListener('click', () => {
    consoleOutput.innerHTML = '';
});

// 初始化
updateStatus('idle');
log('系統就緒。請輸入程式碼並點擊「執行程式碼」。', 'info');
