// Double Buffer Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let front = [], back = [], swaps = 0;
        for (let i = 0; i < param; i++) {
            back.push(i);
            if (back.length >= 100) { [front, back] = [back, []]; swaps++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Swaps: ${swaps}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Swaps': swaps, 'Duration': duration } });
    }
};