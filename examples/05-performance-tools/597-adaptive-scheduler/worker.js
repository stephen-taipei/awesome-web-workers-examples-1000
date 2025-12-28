// Adaptive Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const loads = [0, 0, 0, 0];
        let adaptations = 0;
        for (let i = 0; i < param; i++) {
            const minIdx = loads.indexOf(Math.min(...loads));
            loads[minIdx] += 1 + Math.random();
            if (Math.max(...loads) - Math.min(...loads) > 10) { loads.fill(loads.reduce((a,b)=>a+b)/4); adaptations++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Adaptations: ${adaptations}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Adaptations': adaptations, 'Duration': duration } });
    }
};