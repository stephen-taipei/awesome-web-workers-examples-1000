/**
 * Structured Clone Worker
 * Tests and validates structured clone algorithm
 */

self.onmessage = function(e) {
    const { type, payload, testType } = e.data;

    switch (type) {
        case 'CLONE_TEST':
            handleCloneTest(payload, testType);
            break;

        case 'PERF_TEST':
            handlePerfTest(payload);
            break;
    }
};

function handleCloneTest(data, testType) {
    const startTime = performance.now();

    let validation = {
        success: true,
        details: []
    };

    try {
        // Validate the received data based on type
        switch (testType) {
            case 'object':
                validation.details.push(`Type check: ${typeof data === 'object'}`);
                validation.details.push(`Has 'name' property: ${'name' in data}`);
                validation.details.push(`Has 'value' property: ${'value' in data}`);
                break;

            case 'array':
                validation.details.push(`Is Array: ${Array.isArray(data)}`);
                validation.details.push(`Length: ${data.length}`);
                validation.details.push(`Contains expected items: ${data.includes('apple')}`);
                break;

            case 'nested':
                validation.details.push(`Has nested object: ${'level1' in data}`);
                validation.details.push(`Nested depth verified: ${data.level1?.level2?.level3?.value === 'deep'}`);
                validation.details.push(`Array in nested: ${Array.isArray(data.level1?.items)}`);
                break;

            case 'date':
                validation.details.push(`Is Date: ${data instanceof Date}`);
                validation.details.push(`Valid date: ${!isNaN(data.getTime())}`);
                validation.details.push(`ISO String: ${data.toISOString()}`);
                break;

            case 'regexp':
                validation.details.push(`Is RegExp: ${data instanceof RegExp}`);
                validation.details.push(`Source: ${data.source}`);
                validation.details.push(`Flags: ${data.flags}`);
                validation.details.push(`Test match: ${data.test('test@example.com')}`);
                break;

            case 'map':
                validation.details.push(`Is Map: ${data instanceof Map}`);
                validation.details.push(`Size: ${data.size}`);
                validation.details.push(`Has key 'one': ${data.has('one')}`);
                validation.details.push(`Get 'one': ${data.get('one')}`);
                break;

            case 'set':
                validation.details.push(`Is Set: ${data instanceof Set}`);
                validation.details.push(`Size: ${data.size}`);
                validation.details.push(`Has 'apple': ${data.has('apple')}`);
                break;

            case 'arraybuffer':
                validation.details.push(`Is ArrayBuffer: ${data instanceof ArrayBuffer}`);
                validation.details.push(`Byte length: ${data.byteLength}`);
                const view = new Uint8Array(data);
                validation.details.push(`First bytes: [${view.slice(0, 5).join(', ')}]`);
                break;

            case 'blob':
                validation.details.push(`Is Blob: ${data instanceof Blob}`);
                validation.details.push(`Size: ${data.size} bytes`);
                validation.details.push(`Type: ${data.type}`);
                break;
        }
    } catch (error) {
        validation.success = false;
        validation.error = error.message;
    }

    const endTime = performance.now();
    validation.cloneTime = (endTime - startTime).toFixed(3);

    // Send back serializable representation
    let serialized;
    try {
        serialized = serializeForDisplay(data, testType);
    } catch (e) {
        serialized = `[Unable to serialize: ${e.message}]`;
    }

    self.postMessage({
        type: 'CLONE_RESULT',
        testType: testType,
        receivedData: serialized,
        validation: validation
    });
}

function serializeForDisplay(data, testType) {
    switch (testType) {
        case 'date':
            return data.toISOString();
        case 'regexp':
            return data.toString();
        case 'map':
            return JSON.stringify(Object.fromEntries(data));
        case 'set':
            return JSON.stringify([...data]);
        case 'arraybuffer':
            return `ArrayBuffer(${data.byteLength} bytes): [${new Uint8Array(data).slice(0, 10).join(', ')}...]`;
        case 'blob':
            return `Blob(${data.size} bytes, type: ${data.type})`;
        default:
            return JSON.stringify(data, null, 2);
    }
}

function handlePerfTest(config) {
    const { size, iterations = 10 } = config;

    // Generate test data
    let testData;
    switch (size) {
        case 'small':
            testData = generateData(1024); // 1KB
            break;
        case 'medium':
            testData = generateData(102400); // 100KB
            break;
        case 'large':
            testData = generateData(1048576); // 1MB
            break;
    }

    const times = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        // The actual clone happens on message receipt
        // We simulate processing time
        JSON.parse(JSON.stringify(testData));
        const end = performance.now();
        times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    self.postMessage({
        type: 'PERF_RESULT',
        results: {
            size: size,
            dataSize: JSON.stringify(testData).length,
            iterations: iterations,
            avgTime: avgTime.toFixed(3),
            minTime: minTime.toFixed(3),
            maxTime: maxTime.toFixed(3),
            throughput: ((JSON.stringify(testData).length / avgTime) * 1000 / 1024 / 1024).toFixed(2)
        }
    });
}

function generateData(targetBytes) {
    const items = [];
    let currentSize = 0;
    let id = 0;

    while (currentSize < targetBytes) {
        const item = {
            id: id++,
            name: `Item ${id}`,
            value: Math.random(),
            timestamp: Date.now(),
            data: 'x'.repeat(100)
        };
        items.push(item);
        currentSize += JSON.stringify(item).length;
    }

    return { items, count: items.length };
}
