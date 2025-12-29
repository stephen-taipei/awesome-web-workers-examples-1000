const lengthInput = document.getElementById('lengthInput');
const countInput = document.getElementById('countInput');
const uppercaseCheck = document.getElementById('uppercaseCheck');
const lowercaseCheck = document.getElementById('lowercaseCheck');
const numbersCheck = document.getElementById('numbersCheck');
const symbolsCheck = document.getElementById('symbolsCheck');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const outputArea = document.getElementById('outputArea');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const generatedCount = document.getElementById('generatedCount');
const timeTaken = document.getElementById('timeTaken');
const avgEntropy = document.getElementById('avgEntropy');

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
            displayPasswords(data.passwords);
            generatedCount.textContent = data.count.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;
            avgEntropy.textContent = `${data.avgEntropy.toFixed(1)} bits`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            generateBtn.disabled = false;
        }
    };
}

function displayPasswords(passwords) {
    outputArea.innerHTML = '';
    const maxDisplay = Math.min(passwords.length, 100);

    for (let i = 0; i < maxDisplay; i++) {
        const pwd = passwords[i];
        const item = document.createElement('div');
        item.className = 'password-item';

        const strength = calculateStrength(pwd);

        item.innerHTML = `
            <div style="flex: 1;">
                <span>${pwd}</span>
                <div class="strength-bar">
                    <div class="strength-fill strength-${strength.level}" style="width: ${strength.percent}%"></div>
                </div>
            </div>
            <button class="copy-btn" onclick="copyPassword('${pwd}')">Copy</button>
        `;
        outputArea.appendChild(item);
    }

    if (passwords.length > 100) {
        const note = document.createElement('div');
        note.style.cssText = 'text-align: center; color: var(--text-muted); padding: 10px;';
        note.textContent = `Showing 100 of ${passwords.length} passwords`;
        outputArea.appendChild(note);
    }
}

function calculateStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 3) return { level: 'weak', percent: 33 };
    if (score <= 5) return { level: 'medium', percent: 66 };
    return { level: 'strong', percent: 100 };
}

window.copyPassword = function(password) {
    navigator.clipboard.writeText(password).then(() => {
        // Brief visual feedback could be added here
    });
};

generateBtn.addEventListener('click', () => {
    const length = parseInt(lengthInput.value) || 16;
    const count = parseInt(countInput.value) || 10;

    const options = {
        uppercase: uppercaseCheck.checked,
        lowercase: lowercaseCheck.checked,
        numbers: numbersCheck.checked,
        symbols: symbolsCheck.checked
    };

    if (!options.uppercase && !options.lowercase && !options.numbers && !options.symbols) {
        alert('Please select at least one character type');
        return;
    }

    generateBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    outputArea.innerHTML = '';

    initWorker();

    worker.postMessage({
        type: 'generate',
        length: length,
        count: count,
        options: options
    });
});

clearBtn.addEventListener('click', () => {
    outputArea.innerHTML = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
