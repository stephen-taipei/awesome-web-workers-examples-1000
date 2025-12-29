const inputArea = document.getElementById('inputArea');
const checkBtn = document.getElementById('checkBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const outputSection = document.getElementById('outputSection');
const annotatedText = document.getElementById('annotatedText');
const errorList = document.getElementById('errorList');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const grammarCount = document.getElementById('grammarCount');
const spellingCount = document.getElementById('spellingCount');
const styleCount = document.getElementById('styleCount');
const timeTaken = document.getElementById('timeTaken');

const sampleText = `Their going to the store tommorrow to buy alot of stuff. Me and him went to school yesterday. The team are playing good today. Each of the students have completed their assignment. I could of done better on the test. Its a beautiful day outside, isnt it? The data shows that less people are reading books. Between you and I, this is a very unique opportunity.`;

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
            displayResults(data);

            const counts = { grammar: 0, spelling: 0, style: 0 };
            data.errors.forEach(e => counts[e.type]++);

            grammarCount.textContent = counts.grammar;
            spellingCount.textContent = counts.spelling;
            styleCount.textContent = counts.style;
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            checkBtn.disabled = false;
        }
    };
}

function displayResults(data) {
    outputSection.classList.remove('hidden');

    // Build annotated text
    let html = data.annotatedHtml;
    annotatedText.innerHTML = html;

    // Build error list
    errorList.innerHTML = '';

    if (data.errors.length === 0) {
        errorList.innerHTML = '<p style="color: var(--success-color); text-align: center; padding: 20px;">No errors found! Great job!</p>';
        return;
    }

    data.errors.forEach((error, index) => {
        const icons = {
            grammar: '!',
            spelling: '?',
            style: '*'
        };

        const item = document.createElement('div');
        item.className = `error-item ${error.type}`;
        item.innerHTML = `
            <div class="error-icon">${icons[error.type]}</div>
            <div class="error-details">
                <div class="error-message">${error.message}</div>
                <div class="error-context">"...${error.context}..."</div>
                ${error.suggestion ? `<div class="error-suggestion">Suggestion: <span class="suggestion">${error.suggestion}</span></div>` : ''}
            </div>
        `;
        errorList.appendChild(item);
    });
}

checkBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    checkBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    outputSection.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'check',
        text: text
    });
});

sampleBtn.addEventListener('click', () => {
    inputArea.value = sampleText;
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputSection.classList.add('hidden');
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
