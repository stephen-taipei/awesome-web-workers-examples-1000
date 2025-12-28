/**
 * #510 Search Benchmark - Worker Thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'START') runBenchmark(payload.size);
};

function runBenchmark(size) {
    sendProgress(0, 'Generating sorted array...');
    const arr = Array.from({ length: size }, (_, i) => i);
    const target = Math.floor(size * 0.75);
    const searchCount = 1000;

    // Build data structures
    sendProgress(10, 'Building data structures...');
    const map = new Map(arr.map(v => [v, true]));
    const set = new Set(arr);

    // Linear search
    sendProgress(25, 'Testing linear search...');
    const linearStart = performance.now();
    for (let i = 0; i < searchCount; i++) {
        linearSearch(arr, target);
    }
    const linearTime = (performance.now() - linearStart) / searchCount;

    // Binary search
    sendProgress(45, 'Testing binary search...');
    const binaryStart = performance.now();
    for (let i = 0; i < searchCount; i++) {
        binarySearch(arr, target);
    }
    const binaryTime = (performance.now() - binaryStart) / searchCount;

    // Map lookup
    sendProgress(65, 'Testing Map lookup...');
    const mapStart = performance.now();
    for (let i = 0; i < searchCount; i++) {
        map.has(target);
    }
    const mapTime = (performance.now() - mapStart) / searchCount;

    // Set has
    sendProgress(85, 'Testing Set has...');
    const setStart = performance.now();
    for (let i = 0; i < searchCount; i++) {
        set.has(target);
    }
    const setTime = (performance.now() - setStart) / searchCount;

    const times = { linear: linearTime, binary: binaryTime, map: mapTime, set: setTime };
    const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: { size, linearTime, binaryTime, mapTime, setTime, fastest }
    });
}

function linearSearch(arr, target) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === target) return i;
    }
    return -1;
}

function binarySearch(arr, target) {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
