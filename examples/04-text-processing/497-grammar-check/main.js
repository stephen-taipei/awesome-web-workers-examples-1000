const inputText = document.getElementById('inputText');
const checkBtn = document.getElementById('checkBtn');
const clearBtn = document.getElementById('clearBtn');
const outputArea = document.getElementById('outputArea');
const timeStats = document.getElementById('timeStats');
const issueStats = document.getElementById('issueStats');

const worker = new Worker('worker.js');

checkBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text.trim()) return;

    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking...';
    outputArea.innerHTML = '<p style="color: #94a3b8;">Scanning...</p>';

    const start = performance.now();

    worker.postMessage({ text });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { issues } = e.data;

        renderIssues(issues, text);

        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        issueStats.textContent = issues.length;

        checkBtn.disabled = false;
        checkBtn.textContent = 'Check Grammar';
    };
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputArea.innerHTML = '<p style="color: #64748b;">No issues found yet.</p>';
    timeStats.textContent = '-';
    issueStats.textContent = '-';
});

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

function renderIssues(issues, originalText) {
    if (issues.length === 0) {
        outputArea.innerHTML = '<p style="color: #4ade80;">No issues found! (Note: This is a basic rule-based checker)</p>';
        return;
    }

    let html = '';
    issues.forEach(issue => {
        // Find context
        const start = Math.max(0, issue.index - 10);
        const end = Math.min(originalText.length, issue.index + issue.length + 10);

        const prefix = originalText.substring(start, issue.index);
        const match = originalText.substring(issue.index, issue.index + issue.length);
        const suffix = originalText.substring(issue.index + issue.length, end);

        // Safe HTML construction
        const context = `${escapeHtml(prefix)}<span style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 0 2px; border-radius: 2px;">${escapeHtml(match)}</span>${escapeHtml(suffix)}`;

        html += `
            <div style="background: rgba(255,255,255,0.05); padding: 0.8rem; margin-bottom: 0.5rem; border-radius: 6px; border-left: 3px solid #ef4444;">
                <div style="font-weight: bold; color: #fca5a5; margin-bottom: 0.3rem;">${escapeHtml(issue.message)}</div>
                <div style="font-family: monospace; color: #cbd5e1; font-size: 0.9em;">"...${context}..."</div>
                ${issue.replacement ? `<div style="color: #4ade80; font-size: 0.9em; margin-top: 0.3rem;">Suggestion: <strong>${escapeHtml(issue.replacement)}</strong></div>` : ''}
            </div>
        `;
    });
    outputArea.innerHTML = html;
}

// Sample text
inputText.value = `I has a apple.
Their are to many mistakes here.
Its raining today.
I want to go to the store, and buy a banana.
The effects of the change was significant.`;
