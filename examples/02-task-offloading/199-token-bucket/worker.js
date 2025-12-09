class TokenBucket {
    constructor(capacity, rate) {
        this.capacity = capacity;
        this.rate = rate; // tokens per second
        this.tokens = capacity; // Start full
        this.lastRefillTimestamp = performance.now();
    }

    refill() {
        const now = performance.now();
        const elapsed = (now - this.lastRefillTimestamp) / 1000;

        if (elapsed > 0) {
            const newTokens = elapsed * this.rate;
            const oldTokens = this.tokens;
            this.tokens = Math.min(this.capacity, this.tokens + newTokens);

            // Notify generation if integer boundary crossed (for visualization effect)
            if (Math.floor(this.tokens) > Math.floor(oldTokens)) {
                self.postMessage({ type: 'TOKEN_GENERATED' });
            }

            this.lastRefillTimestamp = now;
        }
    }

    consume(amount) {
        this.refill();

        if (this.tokens >= amount) {
            this.tokens -= amount;
            return true;
        }
        return false;
    }

    updateConfig(capacity, rate) {
        this.capacity = capacity;
        this.rate = rate;
        this.lastRefillTimestamp = performance.now(); // Reset refiller
        if (this.tokens > capacity) {
            this.tokens = capacity;
        }
    }

    getStatus() {
        this.refill();
        return {
            tokens: this.tokens,
            capacity: this.capacity,
            rate: this.rate
        };
    }
}

let bucket = new TokenBucket(10, 1);

// 定期更新 UI
setInterval(() => {
    self.postMessage({
        type: 'STATUS_UPDATE',
        payload: bucket.getStatus()
    });
}, 100);

self.onmessage = function(e) {
    const { type, payload, tokensNeeded } = e.data;

    switch (type) {
        case 'CONFIG':
            bucket.updateConfig(payload.capacity, payload.rate);
            break;

        case 'REQUEST':
            const success = bucket.consume(tokensNeeded);
            if (success) {
                self.postMessage({
                    type: 'EVENT_LOG',
                    payload: { type: 'allow', tokens: tokensNeeded }
                });
            } else {
                self.postMessage({
                    type: 'EVENT_LOG',
                    payload: { type: 'deny', tokens: tokensNeeded }
                });
            }
            break;
    }
};
