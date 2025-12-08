let isInitialized = false;

// Simulate heavy initialization (e.g., loading WASM, large datasets, or models)
function initialize() {
    const start = Date.now();
    while (Date.now() - start < 1000) {
        // Busy wait to simulate heavy CPU load during init
    }
    isInitialized = true;
}

// Perform the actual task
function performTask() {
    // Task is fast
    const result = Math.sqrt(123456789);
    return result;
}

onmessage = function(e) {
    const { type } = e.data;

    if (type === 'init') {
        if (!isInitialized) {
            initialize();
        }
        postMessage({ type: 'ready' });
    } else if (type === 'task') {
        if (!isInitialized) {
            // Lazy initialization if not pre-warmed
            initialize();
        }

        const result = performTask();
        postMessage({ type: 'result', payload: result });
    }
};
