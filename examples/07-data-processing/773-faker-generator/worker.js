/**
 * Faker Generator Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload.data);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function handleProcess(data) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Processing...');
        const result = processData(data);
        sendProgress(90, 'Finalizing...');
        result.duration = performance.now() - startTime;
        sendResult(result);
    } catch (error) {
        sendError('Processing error: ' + error.message);
    }
}

function processData(data) {
    const config = typeof data === 'object' && !Array.isArray(data) ? data : { count: 5 };
    const count = config.count || 5;
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const faked = [];
    for (let i = 0; i < count; i++) {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        faked.push({
            name: first + ' ' + last,
            email: (first.toLowerCase() + '.' + last.toLowerCase() + '@' + domains[i % 4]),
            phone: '555-' + String(1000 + Math.floor(Math.random() * 9000)),
            address: (100 + i) + ' ' + ['Main', 'Oak', 'Maple', 'Cedar'][i % 4] + ' Street'
        });
    }
    return { output: faked, stats: { count: faked.length, processed: faked.length } };
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

function sendResult(data) {
    self.postMessage({ type: 'RESULT', payload: data });
}

function sendError(message) {
    self.postMessage({ type: 'ERROR', payload: { message } });
}
