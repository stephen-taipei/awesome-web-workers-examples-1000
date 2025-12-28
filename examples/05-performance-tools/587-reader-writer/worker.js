// Reader Writer Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let readers = 0, writers = 0, reads = 0, writes = 0;
        for (let i = 0; i < param; i++) {
            if (Math.random() > 0.3) { readers++; reads++; readers--; }
            else if (readers === 0) { writers++; writes++; writers--; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `R:${reads} W:${writes}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Reads': reads, 'Writes': writes, 'Duration': duration } });
    }
};