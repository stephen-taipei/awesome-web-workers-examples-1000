const testPostMsgBtn = document.getElementById('testPostMsgBtn');
const testSabBtn = document.getElementById('testSabBtn');
const iterationsSelect = document.getElementById('iterations');
const postMsgTimeDisplay = document.getElementById('postMsgTime');
const sabTimeDisplay = document.getElementById('sabTime');

let worker = null;

// Test 1: postMessage Ping-Pong
// We want to measure the overhead of sending a message for every single update (or batches)
// But for fair comparison with Shared Memory (which is usually for frequent small updates),
// we will simulate a counter increment.
function runPostMessageTest() {
    if (worker) worker.terminate();
    worker = new Worker('worker-postmsg.js');

    const iterations = parseInt(iterationsSelect.value);

    testPostMsgBtn.disabled = true;
    testSabBtn.disabled = true;
    postMsgTimeDisplay.textContent = 'Running...';

    const startTime = performance.now();

    worker.postMessage({ iterations });

    worker.onmessage = function(e) {
        const endTime = performance.now();
        postMsgTimeDisplay.textContent = `${(endTime - startTime).toFixed(2)} ms`;
        testPostMsgBtn.disabled = false;
        testSabBtn.disabled = false;
    };
}

// Test 2: SharedArrayBuffer
function runSabTest() {
    if (worker) worker.terminate();
    worker = new Worker('worker-sab.js');

    const iterations = parseInt(iterationsSelect.value);
    const sab = new SharedArrayBuffer(4); // 32-bit int
    const view = new Int32Array(sab);

    testPostMsgBtn.disabled = true;
    testSabBtn.disabled = true;
    sabTimeDisplay.textContent = 'Running...';

    const startTime = performance.now();

    worker.postMessage({ iterations, sab });

    worker.onmessage = function(e) {
        const endTime = performance.now();
        sabTimeDisplay.textContent = `${(endTime - startTime).toFixed(2)} ms`;
        // Verify result (optional)
        // console.log("SAB value:", Atomics.load(view, 0));
        testPostMsgBtn.disabled = false;
        testSabBtn.disabled = false;
    };
}

testPostMsgBtn.addEventListener('click', runPostMessageTest);
testSabBtn.addEventListener('click', runSabTest);
