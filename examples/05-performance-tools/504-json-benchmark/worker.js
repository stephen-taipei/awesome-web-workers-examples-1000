/**
 * #504 JSON Benchmark - Worker Thread
 * Performs JSON parsing and stringification benchmarks
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'START') {
        runBenchmark(payload.objects);
    }
};

function runBenchmark(count) {
    const startTime = performance.now();

    sendProgress(0, 'Generating test data...');

    // Generate complex objects
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push({
            id: i,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            active: i % 2 === 0,
            score: Math.random() * 100,
            tags: ['tag1', 'tag2', 'tag3'],
            nested: {
                level1: {
                    level2: {
                        value: Math.random()
                    }
                }
            }
        });
    }

    sendProgress(20, 'Testing JSON.stringify...');
    const stringifyStart = performance.now();
    const jsonString = JSON.stringify(data);
    const stringifyTime = performance.now() - stringifyStart;

    sendProgress(45, 'Testing JSON.parse...');
    const parseStart = performance.now();
    const parsed = JSON.parse(jsonString);
    const parseTime = performance.now() - parseStart;

    sendProgress(70, 'Testing deep clone...');
    const cloneStart = performance.now();
    const cloned = JSON.parse(JSON.stringify(data));
    const cloneTime = performance.now() - cloneStart;

    const totalTime = performance.now() - startTime;
    const dataSize = jsonString.length;

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: {
            objects: count,
            totalTime,
            stringifyTime,
            parseTime,
            cloneTime,
            dataSize
        }
    });
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}
