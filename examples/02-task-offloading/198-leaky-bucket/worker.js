class LeakyBucket {
    constructor(capacity, leakRate) {
        this.capacity = capacity;
        this.leakRate = leakRate; // units per second
        this.currentWater = 0;
        this.lastLeakTime = performance.now();
    }

    leak() {
        const now = performance.now();
        const elapsed = (now - this.lastLeakTime) / 1000; // seconds

        if (elapsed > 0) {
            const leakedAmount = elapsed * this.leakRate;
            if (this.currentWater > 0) {
                this.currentWater = Math.max(0, this.currentWater - leakedAmount);
            }
            this.lastLeakTime = now;
        }
    }

    addWater(amount) {
        this.leak(); // Update state before adding

        if (this.currentWater + amount <= this.capacity) {
            this.currentWater += amount;
            return true;
        } else {
            return false;
        }
    }

    updateConfig(capacity, leakRate) {
        this.capacity = capacity;
        this.leakRate = leakRate;
        this.leak(); // Ensure accurate state on update
    }

    getStatus() {
        this.leak();
        return {
            currentWater: this.currentWater,
            capacity: this.capacity,
            leakRate: this.leakRate,
            isLeaking: this.currentWater > 0
        };
    }
}

let bucket = new LeakyBucket(10, 1);

// 定期更新狀態給 UI
setInterval(() => {
    self.postMessage({
        type: 'STATUS_UPDATE',
        payload: bucket.getStatus()
    });
}, 50); // High frequency for smooth animation

self.onmessage = function(e) {
    const { type, payload, amount } = e.data;

    switch (type) {
        case 'CONFIG':
            bucket.updateConfig(payload.capacity, payload.leakRate);
            break;

        case 'ADD_WATER':
            const success = bucket.addWater(amount);
            if (success) {
                self.postMessage({ type: 'EVENT_LOG', payload: { type: 'add', amount: amount } });
                // If water exists, it implies processing (leaking) is happening automatically via leak() called in getStatus/addWater
            } else {
                self.postMessage({ type: 'EVENT_LOG', payload: { type: 'drop', amount: amount } });
            }
            break;
    }
};
