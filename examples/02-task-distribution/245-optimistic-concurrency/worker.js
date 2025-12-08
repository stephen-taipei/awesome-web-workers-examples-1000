// Optimistic Concurrency Control - Web Worker

let workerId;
let currentVersion;
let localState;
let transactionId = 0;

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'start') {
        workerId = data.workerId;
        currentVersion = data.initialVersion;
        localState = JSON.parse(JSON.stringify(data.initialState));
        runTransactions(data);
    } else if (data.type === 'validation_result') {
        handleValidationResult(data);
    } else if (data.type === 'locking_mode') {
        runLockingMode(data);
    }
};

let pendingValidations = new Map();
let stats = {
    transactions: 0,
    committed: 0,
    conflicts: 0,
    retries: 0
};

function runTransactions(config) {
    const { scenario, transactionCount, conflictProbability, maxRetries } = config;

    stats = { transactions: 0, committed: 0, conflicts: 0, retries: 0 };

    processTransactionBatch(scenario, transactionCount, conflictProbability, maxRetries, 0);
}

function processTransactionBatch(scenario, total, conflictProb, maxRetries, current) {
    if (current >= total) {
        self.postMessage({ type: 'complete', stats });
        return;
    }

    const tx = createTransaction(scenario, conflictProb);
    tx.retryCount = 0;
    tx.maxRetries = maxRetries;
    tx.scenario = scenario;
    tx.conflictProb = conflictProb;
    tx.totalTransactions = total;
    tx.currentIndex = current;

    executeTransaction(tx);
}

function createTransaction(scenario, conflictProb) {
    const id = `${workerId}-${++transactionId}`;
    const startTime = performance.now();

    let operation, readSet, writeSet;

    switch (scenario) {
        case 'banking':
            operation = createBankingOperation(conflictProb);
            break;
        case 'inventory':
            operation = createInventoryOperation(conflictProb);
            break;
        case 'document':
            operation = createDocumentOperation(conflictProb);
            break;
        case 'counter':
            operation = createCounterOperation();
            break;
        default:
            operation = createBankingOperation(conflictProb);
    }

    return {
        id,
        workerId,
        startTime,
        ...operation
    };
}

function createBankingOperation(conflictProb) {
    const accounts = localState.accounts || [1000, 1000, 1000, 1000, 1000];
    const numAccounts = accounts.length;

    // Higher conflict probability = more likely to use account 0
    const useHotspot = Math.random() * 100 < conflictProb;
    const fromAccount = useHotspot ? 0 : Math.floor(Math.random() * numAccounts);
    let toAccount = Math.floor(Math.random() * numAccounts);
    while (toAccount === fromAccount) {
        toAccount = Math.floor(Math.random() * numAccounts);
    }

    const amount = Math.floor(Math.random() * 100) + 1;

    return {
        operation: 'transfer',
        readSet: [
            { key: `accounts.${fromAccount}`, version: currentVersion },
            { key: `accounts.${toAccount}`, version: currentVersion }
        ],
        writeSet: [
            { key: `accounts.${fromAccount}`, value: accounts[fromAccount] - amount },
            { key: `accounts.${toAccount}`, value: accounts[toAccount] + amount }
        ],
        details: { from: fromAccount, to: toAccount, amount }
    };
}

function createInventoryOperation(conflictProb) {
    const products = localState.products || [100, 100, 100, 100, 100];
    const numProducts = products.length;

    const useHotspot = Math.random() * 100 < conflictProb;
    const productId = useHotspot ? 0 : Math.floor(Math.random() * numProducts);
    const quantity = Math.floor(Math.random() * 10) + 1;
    const isRestock = Math.random() > 0.5;

    const newQuantity = isRestock ?
        products[productId] + quantity :
        Math.max(0, products[productId] - quantity);

    return {
        operation: isRestock ? 'restock' : 'sell',
        readSet: [
            { key: `products.${productId}`, version: currentVersion }
        ],
        writeSet: [
            { key: `products.${productId}`, value: newQuantity }
        ],
        details: { product: productId, quantity, operation: isRestock ? 'restock' : 'sell' }
    };
}

function createDocumentOperation(conflictProb) {
    const sections = localState.sections || ['', '', '', '', ''];
    const numSections = sections.length;

    const useHotspot = Math.random() * 100 < conflictProb;
    const sectionId = useHotspot ? 0 : Math.floor(Math.random() * numSections);
    const newContent = `W${workerId}-Edit${transactionId}`;

    return {
        operation: 'edit',
        readSet: [
            { key: `sections.${sectionId}`, version: currentVersion }
        ],
        writeSet: [
            { key: `sections.${sectionId}`, value: sections[sectionId] + newContent }
        ],
        details: { section: sectionId, content: newContent }
    };
}

function createCounterOperation() {
    const counter = localState.counter || 0;

    return {
        operation: 'increment',
        readSet: [
            { key: 'counter', version: currentVersion }
        ],
        writeSet: [
            { key: 'counter', value: counter + 1 }
        ],
        details: { oldValue: counter, newValue: counter + 1 }
    };
}

function executeTransaction(tx) {
    stats.transactions++;

    // Simulate read phase work
    simulateWork(50);

    // Send validation request to main thread
    pendingValidations.set(tx.id, tx);

    self.postMessage({
        type: 'validate',
        transaction: tx
    });
}

function handleValidationResult(result) {
    const tx = pendingValidations.get(result.transactionId);
    if (!tx) return;

    pendingValidations.delete(result.transactionId);

    if (result.valid) {
        // Transaction committed successfully
        stats.committed++;
        currentVersion = result.newVersion;

        // Update local state
        tx.writeSet.forEach(write => {
            const keys = write.key.split('.');
            let target = localState;
            for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
            }
            target[keys[keys.length - 1]] = write.value;
        });

        // Report progress
        const progress = (tx.currentIndex + 1) / tx.totalTransactions * 100;
        self.postMessage({
            type: 'progress',
            workerId,
            progress,
            committed: stats.committed,
            conflicts: stats.conflicts
        });

        // Process next transaction
        processTransactionBatch(
            tx.scenario,
            tx.totalTransactions,
            tx.conflictProb,
            tx.maxRetries,
            tx.currentIndex + 1
        );

    } else {
        // Transaction failed validation
        stats.conflicts++;

        if (tx.retryCount < tx.maxRetries) {
            // Retry the transaction
            stats.retries++;
            tx.retryCount++;

            // Update version and retry
            currentVersion = result.newVersion;

            // Backoff before retry
            const backoffTime = Math.pow(2, tx.retryCount) * 10;
            setTimeout(() => {
                // Create fresh transaction with updated state
                const retryTx = createTransaction(tx.scenario, tx.conflictProb);
                retryTx.retryCount = tx.retryCount;
                retryTx.maxRetries = tx.maxRetries;
                retryTx.scenario = tx.scenario;
                retryTx.conflictProb = tx.conflictProb;
                retryTx.totalTransactions = tx.totalTransactions;
                retryTx.currentIndex = tx.currentIndex;

                executeTransaction(retryTx);
            }, backoffTime);

        } else {
            // Max retries exceeded, move to next transaction
            const progress = (tx.currentIndex + 1) / tx.totalTransactions * 100;
            self.postMessage({
                type: 'progress',
                workerId,
                progress,
                committed: stats.committed,
                conflicts: stats.conflicts
            });

            processTransactionBatch(
                tx.scenario,
                tx.totalTransactions,
                tx.conflictProb,
                tx.maxRetries,
                tx.currentIndex + 1
            );
        }
    }
}

function runLockingMode(config) {
    const { scenario, transactionCount, initialState } = config;

    let state = JSON.parse(JSON.stringify(initialState));
    let completed = 0;

    // Simulate pessimistic locking (sequential execution)
    for (let i = 0; i < transactionCount; i++) {
        // Acquire lock (simulated)
        simulateWork(10);

        // Execute transaction
        switch (scenario) {
            case 'banking':
                const accounts = state.accounts;
                const from = Math.floor(Math.random() * accounts.length);
                let to = Math.floor(Math.random() * accounts.length);
                while (to === from) to = Math.floor(Math.random() * accounts.length);
                const amount = Math.floor(Math.random() * 100) + 1;
                accounts[from] -= amount;
                accounts[to] += amount;
                break;

            case 'inventory':
                const products = state.products;
                const productId = Math.floor(Math.random() * products.length);
                const qty = Math.floor(Math.random() * 10) + 1;
                products[productId] = Math.max(0, products[productId] - qty);
                break;

            case 'document':
                const sections = state.sections;
                const sectionId = Math.floor(Math.random() * sections.length);
                sections[sectionId] += `Edit${i}`;
                break;

            case 'counter':
                state.counter++;
                break;
        }

        simulateWork(50);

        // Release lock (simulated)
        simulateWork(10);

        completed++;
    }

    self.postMessage({
        type: 'locking_complete',
        completed
    });
}

function simulateWork(iterations) {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sin(i) * Math.cos(i);
    }
    return result;
}
