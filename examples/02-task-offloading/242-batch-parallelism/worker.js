// Batch Parallelism - Web Worker
// Processes batches of items efficiently

self.onmessage = function(e) {
    const { mode, taskType, items, complexity, batchId, workerId } = e.data;

    if (mode === 'batch') {
        processBatch(taskType, items, complexity, batchId, workerId);
    } else if (mode === 'individual') {
        processIndividual(taskType, items, complexity, workerId);
    }
};

function processBatch(taskType, items, complexity, batchId, workerId) {
    const startTime = performance.now();
    const results = [];

    for (let i = 0; i < items.length; i++) {
        const result = processItem(taskType, items[i], complexity);
        results.push(result);

        // Report progress within batch
        if (i % Math.max(1, Math.floor(items.length / 5)) === 0) {
            self.postMessage({
                type: 'batchProgress',
                workerId,
                batchId,
                progress: (i + 1) / items.length
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'batchComplete',
        workerId,
        batchId,
        itemCount: items.length,
        processingTime: endTime - startTime,
        checksum: results.reduce((a, b) => a + b, 0)
    });
}

function processIndividual(taskType, items, complexity, workerId) {
    const startTime = performance.now();
    let processedCount = 0;

    for (let i = 0; i < items.length; i++) {
        const itemStart = performance.now();
        const result = processItem(taskType, items[i], complexity);
        const itemEnd = performance.now();

        processedCount++;

        // Report each item completion (high overhead)
        self.postMessage({
            type: 'itemComplete',
            workerId,
            itemIndex: i,
            result,
            itemTime: itemEnd - itemStart
        });
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'workerComplete',
        workerId,
        itemCount: processedCount,
        totalTime: endTime - startTime
    });
}

function processItem(taskType, item, complexity) {
    switch (taskType) {
        case 'imageProcess':
            return simulateImageProcessing(item, complexity);
        case 'dataTransform':
            return simulateDataTransform(item, complexity);
        case 'calculation':
            return simulateMathCalculation(item, complexity);
        default:
            return item;
    }
}

// Simulate image processing (blur filter)
function simulateImageProcessing(item, complexity) {
    const iterations = getIterations(complexity);
    let value = item.value || item;

    // Simulate convolution-like operations
    for (let i = 0; i < iterations; i++) {
        // Gaussian blur simulation
        const kernel = [1, 4, 6, 4, 1];
        let sum = 0;
        for (let j = 0; j < kernel.length; j++) {
            sum += (value + j) * kernel[j];
        }
        value = sum / 16;

        // Additional processing
        value = Math.sin(value) * 127 + 128;
        value = Math.floor(value) % 256;
    }

    return value;
}

// Simulate data transformation
function simulateDataTransform(item, complexity) {
    const iterations = getIterations(complexity);
    let data = item.data || item;

    for (let i = 0; i < iterations; i++) {
        // JSON-like serialization/deserialization simulation
        let str = '';
        for (let j = 0; j < 10; j++) {
            str += String.fromCharCode(65 + (data + j) % 26);
        }

        // Hash-like computation
        let hash = 0;
        for (let j = 0; j < str.length; j++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(j);
            hash = hash & hash;
        }

        data = Math.abs(hash);
    }

    return data % 10000;
}

// Simulate mathematical calculations
function simulateMathCalculation(item, complexity) {
    const iterations = getIterations(complexity);
    let result = item.number || item;

    for (let i = 0; i < iterations; i++) {
        // Complex mathematical operations
        result = Math.sqrt(result * result + i);
        result = Math.log(result + 1) * Math.E;
        result = Math.pow(result, 1.1);

        // Trigonometric calculations
        result = Math.sin(result) + Math.cos(result);
        result = Math.abs(result) * 1000;

        // Prevent overflow
        if (result > 1e10) result = result % 1e10;
    }

    return Math.floor(result);
}

function getIterations(complexity) {
    switch (complexity) {
        case 'light': return 50;
        case 'medium': return 200;
        case 'heavy': return 800;
        default: return 200;
    }
}
