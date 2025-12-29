// Deadline Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const tasks = Array(param).fill(0).map((_, i) => ({ id: i, deadline: i + Math.random() * 100 }));
        tasks.sort((a, b) => a.deadline - b.deadline);
        let onTime = 0, late = 0;
        tasks.forEach((t, i) => {
            if (i <= t.deadline) onTime++; else late++;
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `On-time: ${onTime}` } });
        });
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'On-time': onTime, 'Late': late, 'Duration': duration } });
    }
};