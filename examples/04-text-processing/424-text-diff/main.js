const leftText = document.getElementById('leftText');
const rightText = document.getElementById('rightText');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const processTimeDisplay = document.getElementById('processTime');
const diffCountDisplay = document.getElementById('diffCount');
const diffResult = document.getElementById('diffResult');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;
            diffCountDisplay.textContent = data.diffCount;
            renderDiff(data.diffs);
            processBtn.disabled = false;
        } else if (type === 'error') {
            alert(`Error: ${data}`);
            processBtn.disabled = false;
        }
    };
}

function renderDiff(diffs) {
    diffResult.innerHTML = '';

    // diffs is an array of objects: { type: 'same'|'add'|'del'|'change', oldText, newText, oldLine, newLine }
    // Or simplified: Just lines with status.
    // Let's assume the worker returns aligned lines for side-by-side view.

    diffs.forEach(line => {
        const row = document.createElement('div');
        row.className = 'diff-row';

        // Line number (Old)
        const lnOld = document.createElement('div');
        lnOld.className = 'line-num';
        lnOld.textContent = line.oldLine || '';

        // Content (Old)
        const contentOld = document.createElement('div');
        contentOld.className = 'code-cell';
        if (line.type === 'del' || line.type === 'change') {
            contentOld.classList.add(line.type === 'del' ? 'diff-del' : 'diff-change-del');
        }
        // Basic escaping
        contentOld.textContent = line.oldText || '';

        // Content (New)
        const contentNew = document.createElement('div');
        contentNew.className = 'code-cell';
        if (line.type === 'add' || line.type === 'change') {
            contentNew.classList.add(line.type === 'add' ? 'diff-add' : 'diff-change-add');
        }
        contentNew.textContent = line.newText || '';

        // Line number (New)
        const lnNew = document.createElement('div');
        lnNew.className = 'line-num';
        lnNew.textContent = line.newLine || '';

        row.appendChild(lnOld);
        row.appendChild(contentOld);
        row.appendChild(contentNew);
        row.appendChild(lnNew);

        diffResult.appendChild(row);
    });
}

processBtn.addEventListener('click', () => {
    initWorker();
    processBtn.disabled = true;
    processTimeDisplay.textContent = '...';
    diffCountDisplay.textContent = '...';

    worker.postMessage({
        text1: leftText.value,
        text2: rightText.value
    });
});

loadSampleBtn.addEventListener('click', () => {
    leftText.value = `function hello() {
    console.log("Hello World");
    return true;
}

// Old comment
const x = 10;`;

    rightText.value = `function hello(name) {
    console.log("Hello " + name);
    return false;
}

// New comment
const x = 20;
const y = 30;`;
});

// Init
initWorker();
