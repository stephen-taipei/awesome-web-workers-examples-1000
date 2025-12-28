/**
 * #609 Structured Clone Algorithm
 * Deep cloning for worker communication
 */

let worker = null;

const elements = {
    testPrimitivesBtn: document.getElementById('test-primitives-btn'),
    testObjectsBtn: document.getElementById('test-objects-btn'),
    testArraysBtn: document.getElementById('test-arrays-btn'),
    testSpecialBtn: document.getElementById('test-special-btn'),
    testUnsupportedBtn: document.getElementById('test-unsupported-btn'),
    results: document.getElementById('results')
};

function initWorker() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === 'result') {
            displayResults(data);
        } else if (type === 'error') {
            displayError(data);
        }
    };
    worker.onerror = (e) => {
        displayError({ message: e.message });
    };
}

function testPrimitives() {
    clearResults();
    addHeader('Testing Primitives');

    const testData = {
        string: 'Hello, Worker!',
        number: 42,
        float: 3.14159,
        boolean: true,
        null: null,
        undefined: undefined, // Will become undefined
        bigint: BigInt(9007199254740991),
        infinity: Infinity,
        negativeInfinity: -Infinity,
        nan: NaN
    };

    worker.postMessage({ type: 'echo', data: testData });
}

function testObjects() {
    clearResults();
    addHeader('Testing Objects');

    const nestedObj = {
        level1: {
            level2: {
                level3: {
                    value: 'deep nested'
                }
            }
        }
    };

    // Create circular reference test separately
    const testData = {
        simple: { a: 1, b: 2 },
        nested: nestedObj,
        withArray: { items: [1, 2, 3] },
        date: new Date(),
        regex: /pattern/gi
    };

    worker.postMessage({ type: 'echo', data: testData });
}

function testArrays() {
    clearResults();
    addHeader('Testing Arrays');

    const testData = {
        simple: [1, 2, 3, 4, 5],
        mixed: [1, 'two', true, null, { obj: true }],
        nested: [[1, 2], [3, 4], [5, 6]],
        typed: {
            int8: new Int8Array([1, 2, 3]),
            uint8: new Uint8Array([255, 128, 0]),
            int16: new Int16Array([1000, 2000]),
            float32: new Float32Array([1.1, 2.2, 3.3]),
            float64: new Float64Array([Math.PI, Math.E])
        },
        buffer: new ArrayBuffer(16)
    };

    worker.postMessage({ type: 'echo', data: testData });
}

function testSpecial() {
    clearResults();
    addHeader('Testing Special Types');

    const map = new Map();
    map.set('key1', 'value1');
    map.set({ obj: true }, 'object key');
    map.set(42, 'number key');

    const set = new Set();
    set.add(1);
    set.add('two');
    set.add({ three: 3 });

    const blob = new Blob(['Hello, Blob!'], { type: 'text/plain' });

    const testData = {
        map,
        set,
        date: new Date('2024-01-01'),
        regex: /test.*pattern/gim,
        blob,
        // DataView
        dataView: new DataView(new ArrayBuffer(8))
    };

    worker.postMessage({ type: 'echo', data: testData });
}

function testUnsupported() {
    clearResults();
    addHeader('Testing Unsupported Types');

    // These will cause errors or be stripped
    try {
        const testData = {
            func: function() { return 'test'; }
        };
        worker.postMessage({ type: 'echo', data: testData });
    } catch (e) {
        displayError({ message: `Function: ${e.message}`, type: 'Function' });
    }

    try {
        const testData = {
            symbol: Symbol('test')
        };
        worker.postMessage({ type: 'echo', data: testData });
    } catch (e) {
        displayError({ message: `Symbol: ${e.message}`, type: 'Symbol' });
    }

    try {
        const testData = {
            domNode: document.createElement('div')
        };
        worker.postMessage({ type: 'echo', data: testData });
    } catch (e) {
        displayError({ message: `DOM Node: ${e.message}`, type: 'DOM Node' });
    }

    addNote('Functions, Symbols, and DOM nodes cannot be cloned');
}

function displayResults(data) {
    for (const [key, value] of Object.entries(data.results)) {
        addResult(key, value.type, value.value, value.preserved);
    }

    if (data.timing) {
        addTiming(data.timing);
    }
}

function displayError(data) {
    const div = document.createElement('div');
    div.className = 'error-message';
    div.innerHTML = `<strong>${data.type || 'Error'}:</strong> ${data.message}`;
    elements.results.appendChild(div);
}

function addHeader(text) {
    const h3 = document.createElement('h3');
    h3.style.cssText = 'color:var(--primary-color);margin:15px 0 10px;';
    h3.textContent = text;
    elements.results.appendChild(h3);
}

function addResult(name, type, value, preserved) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:10px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';

    const statusColor = preserved ? 'var(--success-color)' : 'var(--warning-color)';
    const statusText = preserved ? 'Preserved' : 'Modified';

    div.innerHTML = `
        <div>
            <strong style="color:var(--text-primary);">${name}</strong>
            <span style="color:var(--text-muted);margin-left:10px;">(${type})</span>
        </div>
        <div style="display:flex;align-items:center;gap:15px;">
            <code style="color:var(--primary-color);font-size:0.85rem;">${truncate(value, 50)}</code>
            <span style="color:${statusColor};font-weight:bold;">${statusText}</span>
        </div>
    `;
    elements.results.appendChild(div);
}

function addTiming(ms) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:10px;margin-top:15px;background:var(--bg-card);border-radius:8px;text-align:center;';
    div.innerHTML = `<span style="color:var(--text-secondary);">Round-trip time:</span> <strong style="color:var(--primary-color);">${ms.toFixed(2)} ms</strong>`;
    elements.results.appendChild(div);
}

function addNote(text) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:10px;margin-top:10px;background:rgba(74,158,255,0.1);border-radius:8px;color:var(--text-secondary);';
    div.innerHTML = `<em>${text}</em>`;
    elements.results.appendChild(div);
}

function truncate(str, len) {
    const s = String(str);
    return s.length > len ? s.substr(0, len) + '...' : s;
}

function clearResults() {
    elements.results.innerHTML = '';
}

// Event listeners
elements.testPrimitivesBtn.addEventListener('click', testPrimitives);
elements.testObjectsBtn.addEventListener('click', testObjects);
elements.testArraysBtn.addEventListener('click', testArrays);
elements.testSpecialBtn.addEventListener('click', testSpecial);
elements.testUnsupportedBtn.addEventListener('click', testUnsupported);

// Initialize
initWorker();
