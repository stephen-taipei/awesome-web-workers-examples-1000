/**
 * Adaptive Rate Limiter Worker
 * Uses AIMD (Additive Increase Multiplicative Decrease) algorithm
 */

class AdaptiveRateLimiter {
    constructor(config) {
        this.baseRate = config.baseRate || 10;
        this.currentRate = this.baseRate;
        this.minRate = config.minRate || 1;
        this.maxRate = config.maxRate || 100;
        this.targetLatency = config.targetLatency || 100;
        this.adjustInterval = config.adjustInterval || 1000;

        // AIMD parameters
        this.increaseStep = 1;
        this.decreaseFactor = 0.5;

        // Metrics
        this.latencies = [];
        this.passedCount = 0;
        this.rejectedCount = 0;
        this.tokens = this.currentRate;
        this.lastRefill = performance.now();

        // State
        this.isRunning = false;
        this.adjustTimer = null;
        this.refillTimer = null;
        this.highLoadMode = false;
    }

    start() {
        this.isRunning = true;
        this.lastRefill = performance.now();

        // Refill tokens periodically
        this.refillTimer = setInterval(() => this.refillTokens(), 100);

        // Adjust rate periodically
        this.adjustTimer = setInterval(() => this.adjustRate(), this.adjustInterval);

        this.sendStatus();
    }

    stop() {
        this.isRunning = false;
        if (this.refillTimer) clearInterval(this.refillTimer);
        if (this.adjustTimer) clearInterval(this.adjustTimer);
        this.sendStatus();
    }

    refillTokens() {
        const now = performance.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.currentRate, this.tokens + this.currentRate * elapsed);
        this.lastRefill = now;
    }

    tryAcquire() {
        if (!this.isRunning) return { allowed: false, reason: 'stopped' };

        // Simulate processing latency
        const latency = this.simulateLatency();
        this.latencies.push(latency);

        // Keep only recent latencies
        if (this.latencies.length > 100) {
            this.latencies.shift();
        }

        if (this.tokens >= 1) {
            this.tokens -= 1;
            this.passedCount++;
            return { allowed: true, latency };
        } else {
            this.rejectedCount++;
            return { allowed: false, reason: 'rate_limited', latency };
        }
    }

    simulateLatency() {
        // Base latency with some variation
        let baseLatency = 20 + Math.random() * 30;

        // High load increases latency
        if (this.highLoadMode) {
            baseLatency += 100 + Math.random() * 200;
        }

        // Higher rate can increase latency
        const loadFactor = this.currentRate / this.maxRate;
        baseLatency += loadFactor * 50;

        return Math.round(baseLatency);
    }

    adjustRate() {
        if (!this.isRunning) return;

        const avgLatency = this.getAverageLatency();
        let direction = 'stable';

        if (avgLatency > this.targetLatency * 1.2) {
            // Latency too high - multiplicative decrease
            this.currentRate = Math.max(
                this.minRate,
                Math.floor(this.currentRate * this.decreaseFactor)
            );
            direction = 'decrease';
            this.log('warn', `延遲過高 (${avgLatency}ms)，降低速率至 ${this.currentRate} req/s`);
        } else if (avgLatency < this.targetLatency * 0.8) {
            // Latency acceptable - additive increase
            this.currentRate = Math.min(
                this.maxRate,
                this.currentRate + this.increaseStep
            );
            direction = 'increase';
            this.log('info', `延遲正常 (${avgLatency}ms)，提升速率至 ${this.currentRate} req/s`);
        }

        this.sendStatus(direction);
    }

    getAverageLatency() {
        if (this.latencies.length === 0) return 0;
        const sum = this.latencies.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.latencies.length);
    }

    setHighLoad(enabled) {
        this.highLoadMode = enabled;
        if (enabled) {
            this.log('warn', '高負載模式啟動');
        } else {
            this.log('info', '高負載模式結束');
        }
    }

    updateConfig(config) {
        if (config.baseRate) this.baseRate = config.baseRate;
        if (config.targetLatency) this.targetLatency = config.targetLatency;
        if (config.adjustInterval) {
            this.adjustInterval = config.adjustInterval;
            if (this.isRunning) {
                clearInterval(this.adjustTimer);
                this.adjustTimer = setInterval(() => this.adjustRate(), this.adjustInterval);
            }
        }
        this.log('info', '配置已更新');
    }

    sendStatus(direction = null) {
        const loadLevel = this.getLoadLevel();
        self.postMessage({
            type: 'STATUS',
            payload: {
                currentRate: this.currentRate,
                avgLatency: this.getAverageLatency(),
                passedCount: this.passedCount,
                rejectedCount: this.rejectedCount,
                isRunning: this.isRunning,
                direction: direction,
                loadLevel: loadLevel,
                rateProgress: ((this.currentRate - this.minRate) / (this.maxRate - this.minRate)) * 100
            }
        });
    }

    getLoadLevel() {
        const avgLatency = this.getAverageLatency();
        if (avgLatency > this.targetLatency * 1.5) return 'critical';
        if (avgLatency > this.targetLatency) return 'high';
        if (avgLatency > this.targetLatency * 0.5) return 'normal';
        return 'low';
    }

    log(level, message) {
        self.postMessage({
            type: 'LOG',
            payload: { level, message, timestamp: Date.now() }
        });
    }
}

let limiter = null;

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            limiter = new AdaptiveRateLimiter(payload);
            limiter.log('info', '自適應限流器已初始化');
            break;

        case 'START':
            if (limiter) {
                limiter.start();
                limiter.log('info', '系統已啟動');
            }
            break;

        case 'STOP':
            if (limiter) {
                limiter.stop();
                limiter.log('info', '系統已停止');
            }
            break;

        case 'REQUEST':
            if (limiter) {
                const result = limiter.tryAcquire();
                self.postMessage({ type: 'REQUEST_RESULT', payload: result });
            }
            break;

        case 'HIGH_LOAD':
            if (limiter) {
                limiter.setHighLoad(payload.enabled);
            }
            break;

        case 'UPDATE_CONFIG':
            if (limiter) {
                limiter.updateConfig(payload);
            }
            break;

        case 'GET_STATUS':
            if (limiter) {
                limiter.sendStatus();
            }
            break;
    }
};
