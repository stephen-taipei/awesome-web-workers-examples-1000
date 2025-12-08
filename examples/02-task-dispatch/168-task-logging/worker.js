function log(level, message) {
    postMessage({
        type: 'log',
        payload: {
            timestamp: Date.now(),
            level: level,
            message: message
        }
    });
}

function executeTask(taskId, duration) {
    log('info', `Starting task ${taskId}...`);

    const start = Date.now();
    while (Date.now() - start < duration) {
        // Simulate work
    }

    if (Math.random() > 0.8) {
         log('warn', `Task ${taskId} encountered a minor issue but recovered.`);
    }

    if (Math.random() > 0.95) {
        log('error', `Task ${taskId} failed validation check.`);
    } else {
        log('info', `Task ${taskId} completed successfully.`);
    }
}

onmessage = function(e) {
    const { type, count } = e.data;

    if (type === 'start') {
        postMessage({ type: 'status', payload: 'Running' });
        log('info', `Received request to start ${count} tasks.`);

        let completed = 0;

        for (let i = 1; i <= count; i++) {
            // Simulate variable task duration
            const duration = Math.floor(Math.random() * 500) + 200;
            executeTask(i, duration);
            completed++;
            postMessage({ type: 'status', payload: `Running task ${i}/${count}` });
        }

        log('info', 'All tasks execution finished.');
        postMessage({ type: 'done' });
    }
};
