/**
 * #512 Regex Benchmark - Worker Thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'START') runBenchmark(payload.iterations);
};

function runBenchmark(iterations) {
    const startTime = performance.now();
    sendProgress(0, 'Preparing test strings...');

    const testStrings = [
        'The quick brown fox jumps over the lazy dog',
        'user@example.com',
        '2024-01-15T10:30:00Z',
        'https://www.example.com/path?query=value',
        '192.168.1.100'
    ];

    // Simple match
    sendProgress(15, 'Testing simple pattern matching...');
    const simpleRe = /fox/;
    const simpleStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        simpleRe.test(testStrings[i % testStrings.length]);
    }
    const simpleTime = performance.now() - simpleStart;

    // Complex pattern
    sendProgress(35, 'Testing complex pattern...');
    const complexRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const complexStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        complexRe.test(testStrings[1]);
    }
    const complexTime = performance.now() - complexStart;

    // Capture groups
    sendProgress(55, 'Testing capture groups...');
    const captureRe = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z/;
    const captureStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        testStrings[2].match(captureRe);
    }
    const captureTime = performance.now() - captureStart;

    // Replace
    sendProgress(75, 'Testing replace...');
    const replaceStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        testStrings[0].replace(/o/g, '0');
    }
    const replaceTime = performance.now() - replaceStart;

    const totalTime = performance.now() - startTime;
    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: { iterations, totalTime, simpleTime, complexTime, captureTime, replaceTime }
    });
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
