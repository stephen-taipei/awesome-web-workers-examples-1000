// Message Priority - Priority Queue Web Worker

// Priority Queue using Binary Heap
class PriorityQueue {
    constructor() {
        this.heap = [];
    }

    size() {
        return this.heap.length;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    peek() {
        return this.heap[0] || null;
    }

    insert(item) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }

    extractMax() {
        if (this.isEmpty()) return null;

        const max = this.heap[0];
        const last = this.heap.pop();

        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }

        return max;
    }

    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);

            if (this.compare(this.heap[index], this.heap[parentIndex]) > 0) {
                [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    bubbleDown(index) {
        const length = this.heap.length;

        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let largest = index;

            if (leftChild < length && this.compare(this.heap[leftChild], this.heap[largest]) > 0) {
                largest = leftChild;
            }

            if (rightChild < length && this.compare(this.heap[rightChild], this.heap[largest]) > 0) {
                largest = rightChild;
            }

            if (largest !== index) {
                [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
                index = largest;
            } else {
                break;
            }
        }
    }

    compare(a, b) {
        // Higher priority first, then earlier timestamp (FIFO for same priority)
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return b.timestamp - a.timestamp; // Earlier timestamp = higher priority
    }

    toArray() {
        return [...this.heap].sort((a, b) => -this.compare(a, b));
    }
}

const messageQueue = new PriorityQueue();
let isProcessing = false;
let stats = {
    processed: 0,
    totalWaitTime: 0,
    byPriority: { 4: 0, 3: 0, 2: 0, 1: 0 },
    lowDelayed: 0
};

self.onmessage = function(e) {
    const { action, data } = e.data;

    switch (action) {
        case 'add':
            addMessage(data);
            break;
        case 'addBatch':
            data.messages.forEach(msg => addMessage(msg));
            break;
        case 'start':
            startProcessing();
            break;
        case 'clear':
            clearQueue();
            break;
        case 'getQueue':
            sendQueueState();
            break;
    }
};

function addMessage(data) {
    const message = {
        id: data.id || generateId(),
        content: data.content,
        priority: data.priority,
        complexity: data.complexity,
        timestamp: Date.now(),
        addedAt: performance.now()
    };

    messageQueue.insert(message);

    self.postMessage({
        type: 'messageAdded',
        message,
        queueSize: messageQueue.size(),
        queueState: messageQueue.toArray()
    });
}

function startProcessing() {
    if (isProcessing) return;
    isProcessing = true;

    self.postMessage({ type: 'processingStarted' });
    processNext();
}

function processNext() {
    if (messageQueue.isEmpty()) {
        isProcessing = false;
        self.postMessage({
            type: 'processingComplete',
            stats
        });
        return;
    }

    const message = messageQueue.extractMax();
    const startTime = performance.now();
    const waitTime = startTime - message.addedAt;

    // Track stats
    stats.processed++;
    stats.totalWaitTime += waitTime;
    stats.byPriority[message.priority]++;

    // Check if low priority was delayed
    if (message.priority === 1 && waitTime > message.complexity * 2) {
        stats.lowDelayed++;
    }

    self.postMessage({
        type: 'processingMessage',
        message,
        queueSize: messageQueue.size(),
        queueState: messageQueue.toArray(),
        waitTime
    });

    // Simulate work based on complexity
    simulateWork(message.complexity);

    const processTime = performance.now() - startTime;

    self.postMessage({
        type: 'messageProcessed',
        message,
        processTime,
        waitTime,
        stats: {
            processed: stats.processed,
            avgWaitTime: stats.totalWaitTime / stats.processed,
            criticalCount: stats.byPriority[4],
            lowDelayed: stats.lowDelayed
        }
    });

    // Use setTimeout to allow other messages to be received
    setTimeout(processNext, 10);
}

function simulateWork(complexity) {
    // Simulate CPU-intensive work
    const iterations = complexity * 1000;
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i);
    }
    return result;
}

function clearQueue() {
    messageQueue.heap = [];
    stats = {
        processed: 0,
        totalWaitTime: 0,
        byPriority: { 4: 0, 3: 0, 2: 0, 1: 0 },
        lowDelayed: 0
    };
    isProcessing = false;

    self.postMessage({
        type: 'queueCleared',
        stats
    });
}

function sendQueueState() {
    self.postMessage({
        type: 'queueState',
        queueSize: messageQueue.size(),
        queueState: messageQueue.toArray(),
        stats
    });
}

function generateId() {
    return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
