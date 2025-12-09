const sourceText = document.getElementById('sourceText');
const searchTerm = document.getElementById('searchTerm');
const searchBtn = document.getElementById('searchBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const processTimeDisplay = document.getElementById('processTime');
const matchCountDisplay = document.getElementById('matchCount');
const resultsList = document.getElementById('resultsList');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;
            matchCountDisplay.textContent = data.matches.length;
            renderResults(data.matches, data.term);
            searchBtn.disabled = false;
        } else if (type === 'error') {
            alert(`Error: ${data}`);
            searchBtn.disabled = false;
        }
    };
}

function renderResults(matches, term) {
    resultsList.innerHTML = '';

    if (matches.length === 0) {
        resultsList.innerHTML = '<div style="padding:1rem; text-align:center; color:#64748b;">未找到結果</div>';
        return;
    }

    // Limit display for performance
    const displayMatches = matches.slice(0, 100);

    displayMatches.forEach(match => {
        const el = document.createElement('div');
        el.className = 'match-item';

        // Context with highlight
        const before = escapeHtml(match.contextBefore);
        const matchText = escapeHtml(match.matchText);
        const after = escapeHtml(match.contextAfter);

        el.innerHTML = `
            <div class="match-index">Index: ${match.index}</div>
            <div class="match-context">...${before}<span class="highlight">${matchText}</span>${after}...</div>
        `;

        resultsList.appendChild(el);
    });

    if (matches.length > 100) {
        const more = document.createElement('div');
        more.style.textAlign = 'center';
        more.style.padding = '1rem';
        more.style.color = '#64748b';
        more.textContent = `還有 ${matches.length - 100} 個結果未顯示...`;
        resultsList.appendChild(more);
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

searchBtn.addEventListener('click', () => {
    if (!sourceText.value || !searchTerm.value) return;

    initWorker();

    searchBtn.disabled = true;
    processTimeDisplay.textContent = '...';
    matchCountDisplay.textContent = '...';
    resultsList.innerHTML = '<div style="padding:1rem;">搜尋中...</div>';

    worker.postMessage({
        text: sourceText.value,
        term: searchTerm.value
    });
});

loadSampleBtn.addEventListener('click', () => {
    // Generate large text
    let text = "";
    const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "TARGET"];

    for(let i=0; i<50000; i++) {
        text += words[Math.floor(Math.random() * words.length)] + " ";
        if (i % 20 === 0) text += "\n";
    }

    sourceText.value = text;
    searchTerm.value = "TARGET";
});

// Init
initWorker();
