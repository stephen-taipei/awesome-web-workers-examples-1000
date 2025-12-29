const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const addBreaks = document.getElementById('addBreaks');
const addEmphasis = document.getElementById('addEmphasis');
const addProsody = document.getElementById('addProsody');
const sayAs = document.getElementById('sayAs');
const voiceSelect = document.getElementById('voiceSelect');
const rateSelect = document.getElementById('rateSelect');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const previewSection = document.getElementById('previewSection');
const ssmlPreview = document.getElementById('ssmlPreview');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const tagCount = document.getElementById('tagCount');
const originalLength = document.getElementById('originalLength');
const ssmlLength = document.getElementById('ssmlLength');

const tagButtons = document.querySelectorAll('.tag-btn');

const sampleText = `Welcome to our *amazing* product demonstration!

Today, on 12/25/2024, we're excited to show you something special...

This product costs only $99.99 and has been rated 4.5 out of 5 stars by over 10,000 customers.

Key features include:
- *Incredible* performance
- Easy setup... just plug and play!
- 24/7 customer support

Call us at 1-800-555-1234 or visit www.example.com to learn more.

Thank you for your attention!`;

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
            outputArea.value = data.ssml;
            displayPreview(data.ssml);

            tagCount.textContent = data.tagCount.toLocaleString();
            originalLength.textContent = data.originalLength.toLocaleString();
            ssmlLength.textContent = data.ssmlLength.toLocaleString();

            previewSection.classList.remove('hidden');
            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            generateBtn.disabled = false;
        }
    };
}

function displayPreview(ssml) {
    // Syntax highlight SSML
    let highlighted = escapeHtml(ssml)
        .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="ssml-tag">$2</span>')
        .replace(/(\s)([\w-]+)(=)/g, '$1<span class="ssml-attr">$2</span>$3')
        .replace(/(=)(&quot;[^&]*&quot;)/g, '$1<span class="ssml-value">$2</span>');

    ssmlPreview.innerHTML = highlighted;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Tag insertion
tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const start = inputArea.selectionStart;
        const end = inputArea.selectionEnd;
        const selected = inputArea.value.substring(start, end);

        let insert = '';
        switch (tag) {
            case 'break':
                insert = '<break time="500ms"/>';
                break;
            case 'emphasis':
                insert = selected ? `<emphasis level="strong">${selected}</emphasis>` : '<emphasis level="strong">text</emphasis>';
                break;
            case 'prosody':
                insert = selected ? `<prosody rate="slow">${selected}</prosody>` : '<prosody rate="slow">text</prosody>';
                break;
            case 'say-as':
                insert = selected ? `<say-as interpret-as="cardinal">${selected}</say-as>` : '<say-as interpret-as="cardinal">123</say-as>';
                break;
            case 'sub':
                insert = selected ? `<sub alias="replacement">${selected}</sub>` : '<sub alias="World Wide Web">WWW</sub>';
                break;
            case 'phoneme':
                insert = selected ? `<phoneme alphabet="ipa" ph="...">${selected}</phoneme>` : '<phoneme alphabet="ipa" ph="pɪˈkɑːn">pecan</phoneme>';
                break;
        }

        inputArea.value = inputArea.value.substring(0, start) + insert + inputArea.value.substring(end);
        inputArea.focus();
        inputArea.setSelectionRange(start + insert.length, start + insert.length);
    });
});

generateBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const options = {
        addBreaks: addBreaks.checked,
        addEmphasis: addEmphasis.checked,
        addProsody: addProsody.checked,
        sayAs: sayAs.checked,
        voice: voiceSelect.value,
        rate: rateSelect.value
    };

    generateBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    previewSection.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'generate',
        text: text,
        options: options
    });
});

copyBtn.addEventListener('click', () => {
    if (outputArea.value) {
        navigator.clipboard.writeText(outputArea.value);
    }
});

sampleBtn.addEventListener('click', () => {
    inputArea.value = sampleText;
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    previewSection.classList.add('hidden');
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
