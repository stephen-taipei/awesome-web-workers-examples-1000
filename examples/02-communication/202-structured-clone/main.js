// DOM Elements
const sentDataDisplay = document.getElementById('sentData');
const receivedDataDisplay = document.getElementById('receivedData');
const validationResult = document.getElementById('validationResult');
const perfTestBtn = document.getElementById('perfTestBtn');
const dataSizeSelect = document.getElementById('dataSize');
const perfResults = document.getElementById('perfResults');

// Worker
const worker = new Worker('worker.js');

// Test data generators
const testDataGenerators = {
    object: () => ({
        name: 'Test Object',
        value: 42,
        active: true,
        tags: ['web', 'worker']
    }),

    array: () => ['apple', 'banana', 'cherry', 1, 2, 3, true, null],

    nested: () => ({
        level1: {
            level2: {
                level3: {
                    value: 'deep'
                }
            },
            items: [1, 2, 3],
            metadata: {
                created: new Date().toISOString(),
                author: 'System'
            }
        }
    }),

    date: () => new Date(),

    regexp: () => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/gi,

    map: () => {
        const map = new Map();
        map.set('one', 1);
        map.set('two', 2);
        map.set('three', 3);
        map.set('nested', { a: 1, b: 2 });
        return map;
    },

    set: () => new Set(['apple', 'banana', 'cherry', 'apple']),

    arraybuffer: () => {
        const buffer = new ArrayBuffer(16);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < 16; i++) {
            view[i] = i * 10;
        }
        return buffer;
    },

    blob: () => new Blob(['Hello, World!'], { type: 'text/plain' }),

    function: () => function testFunc() { return 42; },

    symbol: () => Symbol('test')
};

// Event Listeners
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => testDataType(btn.dataset.type));
});

perfTestBtn.addEventListener('click', runPerfTest);

// Worker message handler
worker.onmessage = function(e) {
    const { type, testType, receivedData, validation, results } = e.data;

    switch (type) {
        case 'CLONE_RESULT':
            displayCloneResult(testType, receivedData, validation);
            break;

        case 'PERF_RESULT':
            displayPerfResult(results);
            break;
    }
};

worker.onerror = function(e) {
    validationResult.innerHTML = `<div class="validation-error">Worker 錯誤: ${e.message}</div>`;
};

function testDataType(dataType) {
    const generator = testDataGenerators[dataType];

    if (!generator) {
        validationResult.innerHTML = `<div class="validation-error">未知的資料類型: ${dataType}</div>`;
        return;
    }

    // Handle unsupported types
    if (dataType === 'function' || dataType === 'symbol') {
        const testData = generator();
        sentDataDisplay.textContent = formatForDisplay(testData, dataType);
        receivedDataDisplay.textContent = '(無法傳輸)';
        validationResult.innerHTML = `
            <div class="validation-error">
                <h4>❌ 不支援的類型</h4>
                <p>${dataType === 'function' ? '函數' : 'Symbol'} 無法通過結構化克隆傳輸。</p>
                <p>嘗試傳輸會導致 DataCloneError。</p>
            </div>
        `;
        return;
    }

    try {
        const testData = generator();

        // Display sent data
        sentDataDisplay.textContent = formatForDisplay(testData, dataType);

        // Send to worker
        worker.postMessage({
            type: 'CLONE_TEST',
            testType: dataType,
            payload: testData
        });

        receivedDataDisplay.textContent = '處理中...';
        validationResult.innerHTML = '<p>驗證中...</p>';

    } catch (error) {
        validationResult.innerHTML = `
            <div class="validation-error">
                <h4>❌ 傳輸錯誤</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function formatForDisplay(data, dataType) {
    switch (dataType) {
        case 'date':
            return data.toISOString();
        case 'regexp':
            return data.toString();
        case 'map':
            return `Map(${data.size}) {\n${[...data.entries()].map(([k, v]) => `  "${k}" => ${JSON.stringify(v)}`).join(',\n')}\n}`;
        case 'set':
            return `Set(${data.size}) { ${[...data].map(v => JSON.stringify(v)).join(', ')} }`;
        case 'arraybuffer':
            return `ArrayBuffer(${data.byteLength} bytes)\nUint8Array: [${new Uint8Array(data).join(', ')}]`;
        case 'blob':
            return `Blob { size: ${data.size}, type: "${data.type}" }`;
        case 'function':
            return data.toString();
        case 'symbol':
            return data.toString();
        default:
            return JSON.stringify(data, null, 2);
    }
}

function displayCloneResult(testType, receivedData, validation) {
    receivedDataDisplay.textContent = receivedData;

    let html = '';

    if (validation.success) {
        html = `
            <div class="validation-success">
                <h4>✅ 克隆成功</h4>
                <p>資料類型: <strong>${testType}</strong></p>
                <p>克隆時間: <strong>${validation.cloneTime} ms</strong></p>
                <h5>驗證詳情:</h5>
                <ul>
                    ${validation.details.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        html = `
            <div class="validation-error">
                <h4>❌ 克隆失敗</h4>
                <p>錯誤: ${validation.error}</p>
            </div>
        `;
    }

    validationResult.innerHTML = html;
}

function runPerfTest() {
    const size = dataSizeSelect.value;

    perfResults.innerHTML = '<p>測試中...</p>';
    perfTestBtn.disabled = true;

    worker.postMessage({
        type: 'PERF_TEST',
        payload: {
            size: size,
            iterations: 10
        }
    });
}

function displayPerfResult(results) {
    perfTestBtn.disabled = false;

    const sizeLabels = {
        small: '小 (1KB)',
        medium: '中 (100KB)',
        large: '大 (1MB)'
    };

    perfResults.innerHTML = `
        <div class="perf-result-card">
            <h4>效能測試結果</h4>
            <table>
                <tr><td>資料大小</td><td>${sizeLabels[results.size]}</td></tr>
                <tr><td>實際大小</td><td>${(results.dataSize / 1024).toFixed(2)} KB</td></tr>
                <tr><td>測試次數</td><td>${results.iterations}</td></tr>
                <tr><td>平均時間</td><td><strong>${results.avgTime} ms</strong></td></tr>
                <tr><td>最小時間</td><td>${results.minTime} ms</td></tr>
                <tr><td>最大時間</td><td>${results.maxTime} ms</td></tr>
                <tr><td>吞吐量</td><td><strong>${results.throughput} MB/s</strong></td></tr>
            </table>
        </div>
    `;
}
