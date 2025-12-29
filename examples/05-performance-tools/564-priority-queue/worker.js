// Priority Queue Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const queue = [];

        // Add items with random priorities
        for (let i = 0; i < param; i++) {
            queue.push({ id: i, priority: Math.floor(Math.random() * 10) });
        }

        // Sort by priority (higher first)
        queue.sort((a, b) => b.priority - a.priority);

        let processed = 0;
        const priorityCounts = {};

        // Process queue
        while (queue.length > 0) {
            const item = queue.shift();
            priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
            processed++;

            if (processed % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(processed / param * 100), message: `Processing priority ${item.priority}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Items': param, 'Priority Levels': Object.keys(priorityCounts).length, 'High Priority (7-9)': (priorityCounts[7] || 0) + (priorityCounts[8] || 0) + (priorityCounts[9] || 0), 'Duration': duration } });
    }
};
