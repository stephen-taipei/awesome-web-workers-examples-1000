const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const resultTableBody = document.querySelector('#resultTable tbody');
const timeTaken = document.getElementById('timeTaken');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, results, totalWords, time } = e.data;
        if (type === 'result') {
            renderTable(results, totalWords);
            timeTaken.textContent = `(耗時: ${time.toFixed(2)}ms, 總詞數: ${totalWords})`;
            processBtn.disabled = false;
            processBtn.textContent = '開始統計';
        }
    };
}

function process() {
    const text = inputText.value;
    if (!text.trim()) return;

    processBtn.disabled = true;
    processBtn.textContent = '處理中...';

    if (!worker) initWorker();
    worker.postMessage({ text });
}

function renderTable(results, total) {
    resultTableBody.innerHTML = '';
    results.forEach((item, index) => {
        const row = document.createElement('tr');
        const percentage = ((item.count / total) * 100).toFixed(2);
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="highlight">${item.word}</td>
            <td>${item.count}</td>
            <td>${percentage}%</td>
        `;
        resultTableBody.appendChild(row);
    });
}

processBtn.addEventListener('click', process);

loadSampleBtn.addEventListener('click', () => {
    inputText.value = `Web Workers makes it possible to run a script operation in a background thread separate from the main execution thread of a web application. The advantage of this is that laborious processing can be performed in a separate thread, allowing the main (usually the UI) thread to run without being blocked/slowed down.

A worker is an object created using a constructor (e.g. Worker()) that runs a named JavaScript file — this file contains the code that will run in the worker thread; workers run in another global context that is different from the current window. Thus, using the window shortcut to get the current global scope (instead of self) within a Worker will return an error.

The worker context is represented by a DedicatedWorkerGlobalScope object (in the case of dedicated workers - standard workers that are utilized by a single script; shared workers use SharedWorkerGlobalScope). A dedicated worker is only accessible from the script that first spawned it, whereas shared workers can be accessed from multiple scripts.

Data is sent between the worker and the main thread via a system of messages — both sides send their messages using the postMessage() method, and respond to messages via the onmessage event handler (the message is contained within the Message event's data attribute). The data is copied rather than shared.

Workers may in turn spawn new workers, as long as those workers are hosted within the same origin as the parent page. In addition, workers may use XMLHttpRequest for network I/O, with the exception that the responseXML and channel attributes on XMLHttpRequest always return null.`;
});

initWorker();
