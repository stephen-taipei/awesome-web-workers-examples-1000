/**
 * Basic Message Passing Worker
 * Demonstrates fundamental postMessage communication
 */

self.onmessage = function(e) {
    const { type, payload, timestamp } = e.data;

    console.log('[Worker] Received:', type, payload);

    let response = {
        originalType: type,
        originalPayload: payload,
        sentTimestamp: timestamp,
        processedTimestamp: Date.now()
    };

    switch (type) {
        case 'TEXT':
            response.type = 'TEXT_RESPONSE';
            response.result = `Worker received: "${payload}"`;
            break;

        case 'PING':
            response.type = 'PONG';
            response.result = 'pong';
            break;

        case 'CALCULATE':
            // Simple calculation to demonstrate processing
            const numbers = Array.from({ length: 1000 }, () => Math.random());
            const sum = numbers.reduce((a, b) => a + b, 0);
            response.type = 'CALCULATE_RESULT';
            response.result = `Sum of 1000 random numbers: ${sum.toFixed(4)}`;
            break;

        case 'GET_TIME':
            response.type = 'TIME_RESULT';
            response.result = new Date().toLocaleString('zh-TW');
            break;

        case 'RANDOM':
            response.type = 'RANDOM_RESULT';
            response.result = Math.random().toString(36).substring(2, 15);
            break;

        case 'ECHO':
            response.type = 'ECHO_RESPONSE';
            response.result = payload;
            break;

        default:
            response.type = 'UNKNOWN';
            response.result = `Unknown message type: ${type}`;
    }

    // Simulate some processing time for visual effect
    setTimeout(() => {
        self.postMessage(response);
    }, 50);
};

// Notify main thread that worker is ready
self.postMessage({
    type: 'WORKER_READY',
    result: 'Worker initialized and ready',
    processedTimestamp: Date.now()
});
