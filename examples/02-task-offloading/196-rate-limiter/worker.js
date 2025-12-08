// Token Bucket Rate Limiter
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate; // tokens per second
        this.tokens = capacity;
        this.lastRefillTimestamp = performance.now();
    }

    refill() {
        const now = performance.now();
        const elapsed = (now - this.lastRefillTimestamp) / 1000; // seconds

        if (elapsed > 0) {
            const newTokens = elapsed * this.refillRate;
            this.tokens = Math.min(this.capacity, this.tokens + newTokens);
            this.lastRefillTimestamp = now;
        }
        return this.tokens;
    }

    tryConsume(amount = 1) {
        this.refill();

        if (this.tokens >= amount) {
            this.tokens -= amount;
            return true;
        }
        return false;
    }

    updateConfig(capacity, refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate;
        // Adjust current tokens if capacity shrank
        if (this.tokens > this.capacity) {
            this.tokens = this.capacity;
        }
        // Reset timestamp to avoid huge jumps if rate changes significantly
        this.lastRefillTimestamp = performance.now();
    }

    getStatus() {
        this.refill();
        return {
            tokens: this.tokens,
            capacity: this.capacity,
            refillRate: this.refillRate
        };
    }
}

let limiter = new TokenBucket(10, 1);

// 定時發送狀態更新
setInterval(() => {
    self.postMessage({
        type: 'STATUS_UPDATE',
        payload: limiter.getStatus()
    });
}, 100); // 每 100ms 更新一次 UI

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'CONFIG':
            limiter.updateConfig(payload.capacity, payload.refillRate);
            break;

        case 'REQUEST':
            const allowed = limiter.tryConsume(1);
            self.postMessage({
                type: 'REQUEST_RESULT',
                payload: {
                    allowed: allowed,
                    remainingTokens: limiter.tokens
                }
            });
            break;
    }
};
