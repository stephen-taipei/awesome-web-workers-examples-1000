// Ring Buffer Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const size = 100;
        const buffer = new Array(size).fill(0);
        let head = 0, tail = 0, count = 0;
        for (let i = 0; i < param; i++) {
            buffer[head] = i;
            head = (head + 1) % size;
            if (count < size) count++;
            else tail = (tail + 1) % size;
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Count: ${count}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Buffer Size': size, 'Items': count, 'Duration': duration } });
    }
};