let quota = 50;
let used = 0;

onmessage = function(e) {
    const { type, quota: newQuota } = e.data;

    if (type === 'setQuota') {
        quota = newQuota;
        // Optionally reset used or keep it? Let's keep it but check immediately if valid
        // Actually, usually setting quota resets the usage or updates the limit.
        // Let's assume setting quota updates the limit for the current session.
        postMessage({
            type: 'quotaUpdated',
            payload: { remaining: Math.max(0, quota - used) }
        });
    } else if (type === 'performOperation') {
        if (used < quota) {
            used++;
            // Simulate work
            const start = Date.now();
            while (Date.now() - start < 50) {}

            postMessage({
                type: 'operationSuccess',
                payload: {
                    count: used,
                    remaining: quota - used
                }
            });
        } else {
            postMessage({ type: 'quotaExceeded' });
        }
    } else if (type === 'reset') {
        used = 0;
        postMessage({
            type: 'reset',
            payload: { remaining: quota }
        });
    }
};
