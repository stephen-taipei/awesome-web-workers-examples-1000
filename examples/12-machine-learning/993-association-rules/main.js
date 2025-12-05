const mineBtn = document.getElementById('mineBtn');
const transactionCountSelect = document.getElementById('transactionCount');
const uniqueProductsInput = document.getElementById('uniqueProducts');
const minSupportInput = document.getElementById('minSupport');
const minConfidenceInput = document.getElementById('minConfidence');

const minSupportDisplay = document.getElementById('minSupportDisplay');
const minConfidenceDisplay = document.getElementById('minConfidenceDisplay');
const timeValue = document.getElementById('timeValue');
const itemsetsCount = document.getElementById('itemsetsCount');
const rulesCount = document.getElementById('rulesCount');
const statusText = document.getElementById('statusText');
const rulesBody = document.getElementById('rulesBody');

let worker;

minSupportInput.addEventListener('input', () => minSupportDisplay.textContent = `${minSupportInput.value}%`);
minConfidenceInput.addEventListener('input', () => minConfidenceDisplay.textContent = `${minConfidenceInput.value}%`);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeValue.textContent = `${data.duration}ms`;
            itemsetsCount.textContent = data.itemsetsFound;
            rulesCount.textContent = data.rulesFound;
            
            updateRulesTable(data.rules);
            mineBtn.disabled = false;
        }
    };
}

mineBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const transactions = parseInt(transactionCountSelect.value);
    const products = parseInt(uniqueProductsInput.value);
    const minSupport = parseInt(minSupportInput.value) / 100;
    const minConfidence = parseInt(minConfidenceInput.value) / 100;

    mineBtn.disabled = true;
    statusText.textContent = 'Initializing...';
    timeValue.textContent = '-';
    itemsetsCount.textContent = '-';
    rulesCount.textContent = '-';
    rulesBody.innerHTML = '<tr><td colspan="4" class="empty">Mining in progress...</td></tr>';

    worker.postMessage({
        command: 'mine',
        transactions,
        products,
        minSupport,
        minConfidence
    });
});

function updateRulesTable(rules) {
    rulesBody.innerHTML = '';
    
    if (rules.length === 0) {
        rulesBody.innerHTML = '<tr><td colspan="4" class="empty">No rules found meeting criteria.</td></tr>';
        return;
    }

    // Show top 20 rules sorted by lift
    const topRules = rules.slice(0, 20);

    topRules.forEach(rule => {
        const tr = document.createElement('tr');
        
        const antecedent = rule.antecedent.join(', ');
        const consequent = rule.consequent.join(', ');
        
        tr.innerHTML = `
            <td>{${antecedent}} &rarr; {${consequent}}</td>
            <td>${(rule.support * 100).toFixed(2)}%</td>
            <td>${(rule.confidence * 100).toFixed(2)}%</td>
            <td>${rule.lift.toFixed(2)}</td>
        `;
        rulesBody.appendChild(tr);
    });
}

initWorker();
