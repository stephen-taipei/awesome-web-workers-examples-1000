self.onmessage = async function(e) {
    if (e.data.action === 'start') {
        let totalScore = 0;

        // 1. Integer Math
        const intScore = runIntegerTest();
        totalScore += intScore;
        self.postMessage({ type: 'testComplete', testId: 'integer', result: '完成', score: intScore });
        await sleep(100);

        // 2. Floating Point
        const floatScore = runFloatTest();
        totalScore += floatScore;
        self.postMessage({ type: 'testComplete', testId: 'float', result: '完成', score: floatScore });
        await sleep(100);

        // 3. Memory Access
        const memScore = runMemoryTest();
        totalScore += memScore;
        self.postMessage({ type: 'testComplete', testId: 'memory', result: '完成', score: memScore });
        await sleep(100);

        // 4. JSON
        const jsonScore = runJsonTest();
        totalScore += jsonScore;
        self.postMessage({ type: 'testComplete', testId: 'json', result: '完成', score: jsonScore });
        await sleep(100);

        self.postMessage({ type: 'allComplete', totalScore: totalScore });
    }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 基準分：假設某個參考機器的性能
// 我們測量執行 N 次操作所需的時間，轉換為分數 (OPS)

function runIntegerTest() {
    const start = performance.now();
    let res = 0;
    const ops = 20000000;
    for (let i = 0; i < ops; i++) {
        res = (res + i) ^ (i % 3);
    }
    const duration = performance.now() - start;
    // Score based on ops/sec
    // Reference: 20M ops in 50ms => 400M ops/sec => 1000 pts
    const score = (ops / duration) / 400;
    return Math.max(0, score);
}

function runFloatTest() {
    const start = performance.now();
    let res = 1.0;
    const ops = 10000000;
    for (let i = 1; i < ops; i++) {
        res = res * 1.0000001 + Math.sin(i);
    }
    const duration = performance.now() - start;
    // Reference: 10M ops in 100ms
    const score = (ops / duration) / 200;
    return Math.max(0, score);
}

function runMemoryTest() {
    const size = 2 * 1024 * 1024; // 2M Int32 = 8MB
    const buffer = new Int32Array(size);
    const start = performance.now();

    // Sequential Write
    for (let i = 0; i < size; i++) {
        buffer[i] = i;
    }
    // Random Read
    let sum = 0;
    const mask = size - 1;
    for (let i = 0; i < size; i++) {
        const idx = (i * 1664525 + 1013904223) & mask; // LCG random
        sum += buffer[idx];
    }

    const duration = performance.now() - start;
    // Reference: 8MB write + read in 50ms
    const score = (size * 2 / duration) / 80;
    return Math.max(0, score);
}

function runJsonTest() {
    // Construct a large object
    const obj = [];
    for (let i = 0; i < 5000; i++) {
        obj.push({ id: i, name: `Item ${i}`, values: [i, i*2, i*3] });
    }

    const start = performance.now();
    // Serialize & Deserialize 5 times
    for (let k = 0; k < 5; k++) {
        JSON.parse(JSON.stringify(obj));
    }
    const duration = performance.now() - start;

    // Reference: 5 cycles in 100ms
    const score = (5 / duration) * 4000;
    return Math.max(0, score);
}
