/**
 * #511 Hash Benchmark - Worker Thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'START') runBenchmark(payload.iterations);
};

function runBenchmark(iterations) {
    const startTime = performance.now();
    sendProgress(0, 'Generating test strings...');

    const strings = Array.from({ length: 1000 }, (_, i) =>
        `test_string_${i}_with_some_additional_content_${Math.random()}`
    );

    // DJB2 hash
    sendProgress(15, 'Testing DJB2 hash...');
    const djb2Start = performance.now();
    for (let i = 0; i < iterations; i++) {
        djb2(strings[i % strings.length]);
    }
    const djb2Time = performance.now() - djb2Start;

    // SDBM hash
    sendProgress(35, 'Testing SDBM hash...');
    const sdbmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        sdbm(strings[i % strings.length]);
    }
    const sdbmTime = performance.now() - sdbmStart;

    // FNV-1a hash
    sendProgress(55, 'Testing FNV-1a hash...');
    const fnvStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        fnv1a(strings[i % strings.length]);
    }
    const fnvTime = performance.now() - fnvStart;

    // Simple hash
    sendProgress(75, 'Testing simple hash...');
    const simpleStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        simpleHash(strings[i % strings.length]);
    }
    const simpleTime = performance.now() - simpleStart;

    const totalTime = performance.now() - startTime;
    const times = { djb2: djb2Time, sdbm: sdbmTime, fnv: fnvTime, simple: simpleTime };
    const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: { iterations, totalTime, djb2Time, sdbmTime, fnvTime, simpleTime, fastest }
    });
}

function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return hash >>> 0;
}

function sdbm(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    }
    return hash >>> 0;
}

function fnv1a(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return hash;
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
