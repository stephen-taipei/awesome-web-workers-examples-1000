let isShuttingDown = false;
let activeTask = null;

function performTask() {
    if (isShuttingDown) return;

    activeTask = 'Processing data...';
    postMessage({ type: 'status', payload: { state: 'Working', task: activeTask } });
    postMessage({ type: 'log', payload: 'Starting new task (3s duration)...' });

    const startTime = Date.now();

    // Simulate long running task in chunks to allow message processing
    function workChunk() {
        if (Date.now() - startTime < 3000) {
            // Busy wait simulation
            const start = Date.now();
            while(Date.now() - start < 100);

            if (Math.random() > 0.9) postMessage({ type: 'log', payload: 'Working...' });
            setTimeout(workChunk, 0);
        } else {
            activeTask = null;
            postMessage({ type: 'log', payload: 'Task completed.' });

            if (isShuttingDown) {
                finalizeShutdown();
            } else {
                postMessage({ type: 'status', payload: { state: 'Idle', task: 'None' } });
            }
        }
    }

    workChunk();
}

function finalizeShutdown() {
    postMessage({ type: 'status', payload: { state: 'Shutting down', task: 'Cleaning up...' } });
    postMessage({ type: 'log', payload: 'Performing cleanup operations...' });

    // Simulate cleanup
    setTimeout(() => {
        postMessage({ type: 'log', payload: 'Cleanup done. Ready to terminate.' });
        postMessage({ type: 'shutdownComplete' });
        close(); // Worker closes itself
    }, 1000);
}

onmessage = function(e) {
    const { type } = e.data;

    if (type === 'startTask') {
        if (isShuttingDown) {
            postMessage({ type: 'log', payload: 'Cannot start task: Worker is shutting down.' });
            return;
        }
        if (activeTask) {
            postMessage({ type: 'log', payload: 'Task already running.' });
            return;
        }
        performTask();
    } else if (type === 'shutdown') {
        isShuttingDown = true;
        postMessage({ type: 'log', payload: 'Shutdown signal received.' });

        if (!activeTask) {
            finalizeShutdown();
        } else {
            postMessage({ type: 'log', payload: 'Waiting for current task to finish before shutdown...' });
        }
    }
};
