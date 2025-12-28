// Retry Handler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        let successful = 0;
        let failed = 0;
        let totalRetries = 0;
        const maxRetries = 3;

        for (let i = 0; i < param; i++) {
            let retries = 0;
            let success = false;

            while (retries <= maxRetries && !success) {
                success = Math.random() > 0.4; // 60% success rate
                if (!success) retries++;
            }

            if (success) {
                successful++;
            } else {
                failed++;
            }
            totalRetries += retries;

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Retries: ${totalRetries}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Operations': param, 'Successful': successful, 'Failed': failed, 'Total Retries': totalRetries, 'Avg Retries': (totalRetries / param).toFixed(2), 'Duration': duration } });
    }
};
