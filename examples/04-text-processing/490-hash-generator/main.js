const inputArea = document.getElementById('inputArea');
const batchArea = document.getElementById('batchArea');
const hashBtn = document.getElementById('hashBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsContainer = document.getElementById('resultsContainer');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const hashCount = document.getElementById('hashCount');
const timeTaken = document.getElementById('timeTaken');

const algoButtons = document.querySelectorAll('.algo-btn');

let worker;

function getSelectedAlgorithms() {
    const selected = [];
    algoButtons.forEach(btn => {
        if (btn.classList.contains('active')) {
            selected.push(btn.dataset.algo);
        }
    });
    return selected;
}

algoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('active');
    });
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        } else if (type === 'result') {
            displayResults(data.results);
            hashCount.textContent = data.hashCount.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            hashBtn.disabled = false;
        }
    };
}

function displayResults(results) {
    resultsContainer.innerHTML = '';

    results.forEach((item, index) => {
        const container = document.createElement('div');
        container.style.marginBottom = '20px';

        if (results.length > 1) {
            const inputLabel = document.createElement('div');
            inputLabel.className = 'hash-label';
            inputLabel.textContent = `Input ${index + 1}: "${item.input.substring(0, 50)}${item.input.length > 50 ? '...' : ''}"`;
            container.appendChild(inputLabel);
        }

        Object.entries(item.hashes).forEach(([algo, hash]) => {
            const hashResult = document.createElement('div');
            hashResult.className = 'hash-result';
            hashResult.innerHTML = `
                <div class="hash-label">${algo}</div>
                <div class="hash-value" onclick="copyHash(this)" title="Click to copy">${hash}</div>
            `;
            container.appendChild(hashResult);
        });

        resultsContainer.appendChild(container);
    });
}

window.copyHash = function(element) {
    navigator.clipboard.writeText(element.textContent);
    const original = element.textContent;
    element.textContent = 'Copied!';
    setTimeout(() => {
        element.textContent = original;
    }, 1000);
};

hashBtn.addEventListener('click', () => {
    const singleInput = inputArea.value;
    const batchInput = batchArea.value;
    const algorithms = getSelectedAlgorithms();

    if (!singleInput && !batchInput) {
        alert('Please enter text to hash');
        return;
    }

    if (algorithms.length === 0) {
        alert('Please select at least one algorithm');
        return;
    }

    const inputs = [];
    if (singleInput) {
        inputs.push(singleInput);
    }
    if (batchInput) {
        const lines = batchInput.split('\n').filter(l => l.trim());
        inputs.push(...lines);
    }

    hashBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    resultsContainer.innerHTML = '';

    initWorker();

    worker.postMessage({
        type: 'hash',
        inputs: inputs,
        algorithms: algorithms
    });
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    batchArea.value = '';
    resultsContainer.innerHTML = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
