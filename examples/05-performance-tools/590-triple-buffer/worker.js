// Triple Buffer Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let buffers = [[], [], []], current = 0, rotations = 0;
        for (let i = 0; i < param; i++) {
            buffers[current].push(i);
            if (buffers[current].length >= 100) { current = (current + 1) % 3; buffers[current] = []; rotations++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Rotations: ${rotations}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Rotations': rotations, 'Duration': duration } });
    }
};