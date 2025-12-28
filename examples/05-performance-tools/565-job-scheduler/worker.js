// Job Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const jobs = [];

        // Create jobs with different execution times
        for (let i = 0; i < param; i++) {
            jobs.push({ id: i, duration: 1 + Math.random() * 9, scheduled: false });
        }

        // Schedule jobs using Shortest Job First
        jobs.sort((a, b) => a.duration - b.duration);

        let currentTime = 0;
        let completed = 0;
        let totalWait = 0;

        jobs.forEach((job, idx) => {
            totalWait += currentTime;
            currentTime += job.duration;
            completed++;

            if (idx % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(completed / param * 100), message: `Scheduling job ${idx + 1}` } });
            }
        });

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Jobs': param, 'Avg Wait Time': (totalWait / param).toFixed(2), 'Total Time': currentTime.toFixed(2), 'Duration': duration } });
    }
};
