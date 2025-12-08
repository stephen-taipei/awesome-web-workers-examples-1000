// Parallel Performance Analysis - Worker Thread

self.onmessage = function(e) {
    const { type, taskType, operations, workerId } = e.data;

    const startTime = performance.now();
    let result;

    switch (taskType) {
        case 'cpu_bound':
            result = cpuBoundTask(operations);
            break;
        case 'mixed':
            result = mixedTask(operations);
            break;
        case 'memory_bound':
            result = memoryBoundTask(operations);
            break;
        default:
            result = cpuBoundTask(operations);
    }

    const executionTime = performance.now() - startTime;

    self.postMessage({
        type: 'result',
        workerId,
        result,
        executionTime
    });
};

function cpuBoundTask(operations) {
    // Pure CPU computation - highly parallelizable
    let result = 0;

    for (let i = 0; i < operations; i++) {
        // Heavy math operations
        result += Math.sin(i * 0.0001) * Math.cos(i * 0.0001);
        result += Math.sqrt(Math.abs(result) + 1);
        result = Math.atan2(result, i + 1);
    }

    return result;
}

function mixedTask(operations) {
    // Mix of CPU and memory operations
    let result = 0;
    const blockSize = 1000;
    const numBlocks = Math.ceil(operations / blockSize);

    // Allocate some memory
    const buffer = new Float64Array(blockSize);

    for (let block = 0; block < numBlocks; block++) {
        // Fill buffer (memory write)
        for (let i = 0; i < blockSize; i++) {
            buffer[i] = Math.sin(block * blockSize + i) * Math.random();
        }

        // Process buffer (CPU + memory read)
        for (let i = 0; i < blockSize; i++) {
            result += buffer[i] * Math.cos(buffer[(i + 1) % blockSize]);
        }

        // Some pure CPU work
        for (let i = 0; i < blockSize / 2; i++) {
            result = Math.sqrt(Math.abs(result) + 1);
        }
    }

    return result;
}

function memoryBoundTask(operations) {
    // Memory intensive task - less parallelizable due to memory bandwidth
    const arraySize = Math.min(operations, 1000000);
    const iterations = Math.ceil(operations / arraySize);

    // Create large array
    const data = new Float64Array(arraySize);

    // Initialize with random values
    for (let i = 0; i < arraySize; i++) {
        data[i] = Math.random();
    }

    let result = 0;

    for (let iter = 0; iter < iterations; iter++) {
        // Random access pattern (cache unfriendly)
        for (let i = 0; i < arraySize; i++) {
            const idx = Math.floor(Math.random() * arraySize);
            result += data[idx];
            data[idx] = result % 1;
        }

        // Sequential access
        for (let i = 0; i < arraySize - 1; i++) {
            data[i] = (data[i] + data[i + 1]) * 0.5;
            result += data[i];
        }
    }

    return result;
}
