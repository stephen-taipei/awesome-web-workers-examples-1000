// Preemptive Simulator Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let preemptions = 0, completions = 0, quantum = 10, slice = 0;
        for (let i = 0; i < param; i++) {
            slice++;
            if (slice >= quantum) { preemptions++; slice = 0; }
            if (Math.random() > 0.9) { completions++; slice = 0; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Preemptions: ${preemptions}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Preemptions': preemptions, 'Completions': completions, 'Duration': duration } });
    }
};