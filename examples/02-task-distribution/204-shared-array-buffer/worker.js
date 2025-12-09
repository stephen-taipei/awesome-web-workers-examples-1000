// SharedArrayBuffer - Worker Thread

let sharedArray = null;
let metadataArray = null;
let workerId = -1;
let shouldStop = false;

self.onmessage = function(e) {
    const { type, sharedBuffer, metadataBuffer } = e.data;

    switch (type) {
        case 'start':
            workerId = e.data.workerId;
            shouldStop = false;

            // Create typed array views on shared buffers
            if (sharedBuffer instanceof SharedArrayBuffer) {
                sharedArray = new Int32Array(sharedBuffer);
                metadataArray = new Int32Array(metadataBuffer);
            } else {
                // Fallback mode - buffer was copied, not shared
                sharedArray = new Int32Array(sharedBuffer);
                metadataArray = new Int32Array(metadataBuffer);
            }

            runDemo(e.data.iterations, e.data.delay, e.data.arraySize);
            break;

        case 'stop':
            shouldStop = true;
            break;
    }
};

function runDemo(iterations, delay, arraySize) {
    let writes = 0;

    const processIteration = (iter) => {
        if (shouldStop || iter >= iterations) {
            // Send completion message
            self.postMessage({
                type: 'complete',
                workerId,
                writes
            });
            return;
        }

        // Each worker writes to random positions in the shared array
        const numWrites = Math.floor(Math.random() * 3) + 1; // 1-3 writes per iteration

        for (let w = 0; w < numWrites; w++) {
            const index = Math.floor(Math.random() * arraySize);
            const value = workerId * 1000 + iter; // Encode worker ID and iteration in value

            // Write to shared memory
            sharedArray[index] = value;
            metadataArray[index] = workerId;

            writes++;

            // Report write to main thread
            self.postMessage({
                type: 'write',
                workerId,
                index,
                value,
                iteration: iter
            });
        }

        // Report progress periodically
        if (iter % 10 === 0) {
            self.postMessage({
                type: 'progress',
                workerId,
                iteration: iter
            });
        }

        // Schedule next iteration with delay
        setTimeout(() => processIteration(iter + 1), delay);
    };

    // Start processing
    processIteration(0);
}

// Utility function to demonstrate reading shared memory
function readSharedValue(index) {
    if (sharedArray && index >= 0 && index < sharedArray.length) {
        return sharedArray[index];
    }
    return null;
}

// Utility function to get statistics about shared array
function getArrayStats() {
    if (!sharedArray) return null;

    let sum = 0;
    let nonZero = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < sharedArray.length; i++) {
        const val = sharedArray[i];
        sum += val;
        if (val !== 0) nonZero++;
        if (val < min) min = val;
        if (val > max) max = val;
    }

    return {
        sum,
        nonZero,
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
        average: sum / sharedArray.length
    };
}
