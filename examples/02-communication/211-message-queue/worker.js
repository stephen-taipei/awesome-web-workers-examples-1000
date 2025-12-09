// Message Queue with Ring Buffer - Web Worker

// SharedArrayBuffer layout:
// [0]: read position
// [1]: write position
// [2]: size (capacity)
// [3]: mutex for MPMC
// [4]: total sent counter
// [5]: total received counter
// [6+]: message buffer (each message: timestamp, producerId, value)
const READ_POS = 0;
const WRITE_POS = 1;
const SIZE = 2;
const MUTEX = 3;
const TOTAL_SENT = 4;
const TOTAL_RECEIVED = 5;
const BUFFER_START = 6;
const MSG_SIZE = 3;

let sharedArray = null;
let bufferSize = 0;
let workerId = '';
let producersDone = false;
let totalMessages = 0;

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'producersDone') {
        producersDone = true;
        totalMessages = data.totalMessages;
        return;
    }

    sharedArray = new Int32Array(data.buffer);
    bufferSize = Atomics.load(sharedArray, SIZE);
    workerId = data.workerId;

    if (data.type === 'producer') {
        runProducer(data.producerId, data.messageCount, data.rate);
    } else if (data.type === 'consumer') {
        runConsumer(data.consumerId, data.rate);
    }
};

function runProducer(producerId, messageCount, rate) {
    const delayMs = 1000 / rate;
    let sent = 0;

    for (let i = 0; i < messageCount; i++) {
        const message = {
            timestamp: performance.now(),
            producerId,
            value: producerId * 10000 + i
        };

        self.postMessage({
            type: 'log',
            message: `Sending message ${i + 1}/${messageCount}`,
            state: 'sending'
        });

        // Try to enqueue
        let success = false;
        let retries = 0;

        while (!success && retries < 100) {
            success = enqueue(message);

            if (!success) {
                self.postMessage({ type: 'queueFull' });
                self.postMessage({
                    type: 'log',
                    message: 'Queue full, waiting...',
                    state: 'waiting'
                });
                // Wait a bit before retrying
                busyWait(5);
                retries++;
            }
        }

        if (success) {
            sent++;
            self.postMessage({
                type: 'sent',
                producerId,
                messageId: i
            });

            // Report queue state
            const readPos = Atomics.load(sharedArray, READ_POS);
            const writePos = Atomics.load(sharedArray, WRITE_POS);
            self.postMessage({
                type: 'queueState',
                length: writePos - readPos
            });
        }

        // Rate limiting
        busyWait(delayMs + Math.random() * delayMs * 0.2);
    }

    self.postMessage({
        type: 'complete',
        count: sent
    });
}

function runConsumer(consumerId, rate) {
    const delayMs = 1000 / rate;
    let received = 0;

    while (true) {
        // Check if we're done
        const totalReceived = Atomics.load(sharedArray, TOTAL_RECEIVED);
        if (producersDone && totalReceived >= totalMessages) {
            break;
        }

        self.postMessage({
            type: 'log',
            message: 'Waiting for message...',
            state: 'waiting'
        });

        // Try to dequeue
        const message = dequeue();

        if (message) {
            const latency = performance.now() - message.timestamp;

            self.postMessage({
                type: 'log',
                message: `Received message from P${message.producerId}: ${message.value}`,
                state: 'receiving'
            });

            self.postMessage({
                type: 'received',
                consumerId,
                producerId: message.producerId,
                value: message.value,
                latency
            });

            // Report queue state
            const readPos = Atomics.load(sharedArray, READ_POS);
            const writePos = Atomics.load(sharedArray, WRITE_POS);
            self.postMessage({
                type: 'queueState',
                length: writePos - readPos
            });

            received++;

            // Rate limiting
            busyWait(delayMs + Math.random() * delayMs * 0.2);
        } else {
            // Queue empty
            if (producersDone) {
                const totalReceived = Atomics.load(sharedArray, TOTAL_RECEIVED);
                if (totalReceived >= totalMessages) {
                    break;
                }
            }
            busyWait(5);
        }
    }

    self.postMessage({
        type: 'complete',
        count: received
    });
}

function enqueue(message) {
    // Acquire mutex for MPMC
    acquireMutex();

    try {
        const readPos = Atomics.load(sharedArray, READ_POS);
        const writePos = Atomics.load(sharedArray, WRITE_POS);

        // Check if full
        if (writePos - readPos >= bufferSize) {
            return false;
        }

        // Write message
        const slot = (writePos % bufferSize) * MSG_SIZE + BUFFER_START;
        Atomics.store(sharedArray, slot, Math.floor(message.timestamp));
        Atomics.store(sharedArray, slot + 1, message.producerId);
        Atomics.store(sharedArray, slot + 2, message.value);

        // Increment write position
        Atomics.add(sharedArray, WRITE_POS, 1);
        Atomics.add(sharedArray, TOTAL_SENT, 1);

        return true;
    } finally {
        releaseMutex();
    }
}

function dequeue() {
    // Acquire mutex for MPMC
    acquireMutex();

    try {
        const readPos = Atomics.load(sharedArray, READ_POS);
        const writePos = Atomics.load(sharedArray, WRITE_POS);

        // Check if empty
        if (readPos >= writePos) {
            return null;
        }

        // Read message
        const slot = (readPos % bufferSize) * MSG_SIZE + BUFFER_START;
        const message = {
            timestamp: Atomics.load(sharedArray, slot),
            producerId: Atomics.load(sharedArray, slot + 1),
            value: Atomics.load(sharedArray, slot + 2)
        };

        // Increment read position
        Atomics.add(sharedArray, READ_POS, 1);
        Atomics.add(sharedArray, TOTAL_RECEIVED, 1);

        return message;
    } finally {
        releaseMutex();
    }
}

function acquireMutex() {
    while (true) {
        const old = Atomics.compareExchange(sharedArray, MUTEX, 0, 1);
        if (old === 0) {
            return;
        }
        // Short spin
        for (let i = 0; i < 100; i++) {
            if (Atomics.load(sharedArray, MUTEX) === 0) break;
        }
    }
}

function releaseMutex() {
    Atomics.store(sharedArray, MUTEX, 0);
}

function busyWait(ms) {
    const start = performance.now();
    while (performance.now() - start < ms) {
        // Busy wait
    }
}
