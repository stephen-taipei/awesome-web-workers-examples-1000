const baseText = document.getElementById('baseText');
const localText = document.getElementById('localText');
const remoteText = document.getElementById('remoteText');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const processTimeDisplay = document.getElementById('processTime');
const conflictCountDisplay = document.getElementById('conflictCount');
const mergeResult = document.getElementById('mergeResult');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;
            conflictCountDisplay.textContent = data.conflictCount;
            renderMerge(data.result);
            processBtn.disabled = false;
        } else if (type === 'error') {
            alert(`Error: ${data}`);
            processBtn.disabled = false;
        }
    };
}

function renderMerge(text) {
    // Simple rendering, maybe highlight conflict blocks?
    // We can regex replace the conflict markers to wrap them in spans.

    // Markers:
    // <<<<<<< LOCAL
    // ...
    // =======
    // ...
    // >>>>>>> REMOTE

    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Highlight conflict blocks
    html = html.replace(
        /(&lt;&lt;&lt;&lt;&lt;&lt;&lt; LOCAL[\s\S]*?&gt;&gt;&gt;&gt;&gt;&gt;&gt; REMOTE)/g,
        '<div class="conflict-block">$1</div>'
    );

    html = html.replace(
        /(&lt;&lt;&lt;&lt;&lt;&lt;&lt; LOCAL)/g,
        '<span class="conflict-marker">$1</span>'
    );
    html = html.replace(
        /(=======)/g,
        '<span class="conflict-marker">$1</span>'
    );
    html = html.replace(
        /(&gt;&gt;&gt;&gt;&gt;&gt;&gt; REMOTE)/g,
        '<span class="conflict-marker">$1</span>'
    );

    mergeResult.innerHTML = html;
}

processBtn.addEventListener('click', () => {
    initWorker();
    processBtn.disabled = true;
    processTimeDisplay.textContent = '...';
    conflictCountDisplay.textContent = '...';

    worker.postMessage({
        base: baseText.value,
        local: localText.value,
        remote: remoteText.value
    });
});

loadSampleBtn.addEventListener('click', () => {
    baseText.value = `Title: Hello World

Line 1: This is unchanged.
Line 2: This will be changed by both.
Line 3: This is unchanged.`;

    localText.value = `Title: Hello World

Line 1: This is unchanged.
Line 2: Changed by Local.
Line 3: This is unchanged.
Line 4: Local added this.`;

    remoteText.value = `Title: Hello Universe

Line 1: This is unchanged.
Line 2: Changed by Remote.
Line 3: This is unchanged.`;
});

// Init
initWorker();
