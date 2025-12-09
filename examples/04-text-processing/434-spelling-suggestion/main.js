const dictionaryInput = document.getElementById('dictionaryInput');
const wordInput = document.getElementById('wordInput');
const suggestBtn = document.getElementById('suggestBtn');
const resultContainer = document.getElementById('resultContainer');
const processingTime = document.getElementById('processingTime');
const suggestionList = document.getElementById('suggestionList');

let worker;

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { suggestions, time } = data;

            processingTime.textContent = `${time.toFixed(2)} ms`;

            suggestionList.innerHTML = '';
            if (suggestions.length === 0) {
                suggestionList.innerHTML = '<span style="color: #bbb;">No suggestions found.</span>';
            } else {
                suggestions.forEach(item => {
                    const badge = document.createElement('span');
                    badge.style.background = 'rgba(16,185,129,0.2)';
                    badge.style.color = '#10b981';
                    badge.style.padding = '5px 10px';
                    badge.style.borderRadius = '20px';
                    badge.style.border = '1px solid #10b981';
                    badge.style.cursor = 'pointer';
                    badge.textContent = item.word;
                    badge.title = `Distance: ${item.distance}`;

                    badge.onclick = () => {
                        wordInput.value = item.word;
                    };

                    suggestionList.appendChild(badge);
                });
            }

            resultContainer.classList.remove('hidden');
            suggestBtn.disabled = false;
        }
    };
}

suggestBtn.addEventListener('click', () => {
    // Basic normalization: split by whitespace
    const dictionary = dictionaryInput.value.split(/[\s\n]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
    const word = wordInput.value.trim();

    if (!word) return;

    suggestBtn.disabled = true;
    resultContainer.classList.add('hidden');

    worker.postMessage({ dictionary, word });
});
