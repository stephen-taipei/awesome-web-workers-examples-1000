const templateText = document.getElementById('templateText');
const jsonText = document.getElementById('jsonText');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const processTimeDisplay = document.getElementById('processTime');
const renderResult = document.getElementById('renderResult');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;
            renderResult.textContent = data.result;
            processBtn.disabled = false;
        } else if (type === 'error') {
            alert(`Error: ${data}`);
            processBtn.disabled = false;
        }
    };
}

processBtn.addEventListener('click', () => {
    initWorker();

    // Validate JSON
    let dataObj;
    try {
        dataObj = JSON.parse(jsonText.value);
    } catch (e) {
        alert('無效的 JSON 數據');
        return;
    }

    processBtn.disabled = true;
    processTimeDisplay.textContent = '...';
    renderResult.textContent = 'Rendering...';

    worker.postMessage({
        template: templateText.value,
        data: dataObj
    });
});

loadSampleBtn.addEventListener('click', () => {
    templateText.value = `Hello {{ user.name }}!

Here is your order summary:
{{#each items}}
- {{ name }}: $\{{ price }}
{{/each}}

Total: $\{{ total }}`;

    jsonText.value = `{
    "user": {
        "name": "Alice"
    },
    "items": [
        { "name": "Apple", "price": 1.2 },
        { "name": "Banana", "price": 0.8 },
        { "name": "Cherry", "price": 2.5 }
    ],
    "total": 4.5
}`;
});

// Init
initWorker();
