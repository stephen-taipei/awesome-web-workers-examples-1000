const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const processBtn = document.getElementById('processBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const formatStyle = document.getElementById('formatStyle');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const processedCount = document.getElementById('processedCount');
const timeTaken = document.getElementById('timeTaken');

let worker;

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
            outputArea.value = data.output;
            processedCount.textContent = data.count.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

processBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    outputArea.value = '';

    initWorker();

    worker.postMessage({
        type: 'process',
        text: text,
        style: formatStyle.value
    });
});

generateBtn.addEventListener('click', () => {
    const addresses = [];
    const streets = ['Main St', 'Broadway', '5th Ave', 'Park Rd', 'Oak Ln', 'Pine St', 'Maple Dr', 'Cedar Ct'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
    const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA'];

    for (let i = 0; i < 10000; i++) {
        const street = `${Math.floor(Math.random() * 9999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`;
        const cityIdx = Math.floor(Math.random() * cities.length);
        const city = cities[cityIdx];
        const state = states[cityIdx];
        const zip = Math.floor(Math.random() * 89999) + 10000;

        // Add some noise/messiness
        const messy = Math.random() > 0.5;
        let addr = '';
        if (messy) {
             addr = `${street.toLowerCase()},   ${city.toUpperCase()} ${state} ${zip}`;
        } else {
             addr = `${street}, ${city}, ${state} ${zip}`;
        }
        addresses.push(addr);
    }

    inputArea.value = addresses.join('\n');
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

// Initialize
initWorker();
