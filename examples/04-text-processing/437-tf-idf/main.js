const documentsInput = document.getElementById('documentsInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultContainer = document.getElementById('resultContainer');
const analysisTime = document.getElementById('analysisTime');
const resultList = document.getElementById('resultList');

let worker;

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { results, time } = data;

            analysisTime.textContent = `${time.toFixed(2)} ms`;

            resultList.innerHTML = '';
            results.forEach((doc, idx) => {
                const div = document.createElement('div');
                div.style.marginBottom = '15px';
                div.style.padding = '10px';
                div.style.background = 'rgba(0,0,0,0.2)';
                div.style.borderRadius = '8px';

                const termsHtml = doc.keywords.map(k =>
                    `<span style="display:inline-block; background:rgba(16,185,129,0.2); padding:2px 6px; border-radius:4px; margin-right:5px; margin-bottom:5px; font-size:0.9em;">
                        ${k.term} <span style="opacity:0.6; font-size:0.8em;">${k.score.toFixed(3)}</span>
                    </span>`
                ).join('');

                div.innerHTML = `
                    <div style="margin-bottom:5px; color:#aaa; font-size:0.8em;">Doc ${idx + 1}: "${doc.text}"</div>
                    <div>${termsHtml}</div>
                `;
                resultList.appendChild(div);
            });

            resultContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
        }
    };
}

analyzeBtn.addEventListener('click', () => {
    const docs = documentsInput.value.split('\n').filter(s => s.trim().length > 0);

    if (docs.length === 0) return;

    analyzeBtn.disabled = true;
    resultContainer.classList.add('hidden');

    worker.postMessage({ docs });
});
