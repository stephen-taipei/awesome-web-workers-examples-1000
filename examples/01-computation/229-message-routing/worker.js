// Message Routing - Generic Worker

let workerId = null;
let workerType = null;
let processedCount = 0;

self.onmessage = function(e) {
    const { action, data } = e.data;

    switch (action) {
        case 'init':
            workerId = data.id;
            workerType = data.type;
            self.postMessage({
                type: 'initialized',
                workerId,
                workerType
            });
            break;

        case 'process':
            processMessage(data);
            break;

        case 'getStats':
            self.postMessage({
                type: 'stats',
                workerId,
                processedCount
            });
            break;
    }
};

function processMessage(data) {
    const { messageId, topic, payload, routedAt } = data;
    const startTime = performance.now();

    self.postMessage({
        type: 'processing',
        workerId,
        messageId,
        topic
    });

    // Simulate work based on worker type
    let result;
    switch (workerType) {
        case 'compute':
            result = simulateCompute(payload);
            break;
        case 'io':
            result = simulateIO(payload);
            break;
        case 'analytics':
            result = simulateAnalytics(payload);
            break;
        default:
            result = { processed: true };
    }

    processedCount++;
    const processTime = performance.now() - startTime;
    const totalLatency = performance.now() - routedAt;

    self.postMessage({
        type: 'completed',
        workerId,
        messageId,
        topic,
        result,
        processTime,
        totalLatency,
        processedCount
    });
}

function simulateCompute(payload) {
    // Simulate CPU-intensive computation
    let sum = 0;
    const iterations = 100000;
    for (let i = 0; i < iterations; i++) {
        sum += Math.sqrt(i) * Math.sin(i);
    }

    return {
        type: 'compute',
        iterations,
        result: sum,
        payload
    };
}

function simulateIO(payload) {
    // Simulate I/O operation with some delay
    const startTime = performance.now();
    while (performance.now() - startTime < 50) {
        // Busy wait to simulate I/O
    }

    return {
        type: 'io',
        operation: 'read/write',
        bytesProcessed: Math.floor(Math.random() * 10000),
        payload
    };
}

function simulateAnalytics(payload) {
    // Simulate analytics processing
    const dataPoints = 1000;
    const values = [];
    for (let i = 0; i < dataPoints; i++) {
        values.push(Math.random() * 100);
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / dataPoints;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / dataPoints;

    return {
        type: 'analytics',
        dataPoints,
        average: avg,
        variance,
        stdDev: Math.sqrt(variance),
        payload
    };
}
