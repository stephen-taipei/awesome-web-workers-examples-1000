class SlidingWindowLimiter {
    constructor(windowSize, limit) {
        this.windowSize = windowSize * 1000; // ms
        this.limit = limit;
        this.requests = []; // Array of timestamps
    }

    cleanOldRequests(now) {
        const threshold = now - this.windowSize;
        while (this.requests.length > 0 && this.requests[0] <= threshold) {
            this.requests.shift();
        }
    }

    tryRequest(timestamp) {
        this.cleanOldRequests(timestamp);

        if (this.requests.length < this.limit) {
            this.requests.push(timestamp);
            return { allowed: true, count: this.requests.length };
        } else {
            return { allowed: false, count: this.requests.length };
        }
    }

    updateConfig(windowSize, limit) {
        this.windowSize = windowSize * 1000;
        this.limit = limit;
    }

    getCount(now) {
        this.cleanOldRequests(now);
        return this.requests.length;
    }
}

let limiter = new SlidingWindowLimiter(10, 5);

// 定期清理並發送狀態
setInterval(() => {
    const now = Date.now();
    const count = limiter.getCount(now);
    self.postMessage({
        type: 'STATUS_UPDATE',
        payload: { count }
    });
}, 500);

self.onmessage = function(e) {
    const { type, payload, timestamp } = e.data;

    switch (type) {
        case 'CONFIG':
            limiter.updateConfig(payload.windowSize, payload.limit);
            break;

        case 'REQUEST':
            // 使用傳入的時間戳或當前時間
            const ts = timestamp || Date.now();
            const result = limiter.tryRequest(ts);

            self.postMessage({
                type: 'REQUEST_RESULT',
                payload: {
                    allowed: result.allowed,
                    count: result.count,
                    timestamp: ts
                }
            });
            break;
    }
};
