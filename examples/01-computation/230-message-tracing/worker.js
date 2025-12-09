// Message Tracing - Traceable Worker

let workerId = null;
let workerName = null;

self.onmessage = function(e) {
    const { action, data, traceContext } = e.data;

    switch (action) {
        case 'init':
            workerId = data.id;
            workerName = data.name;
            self.postMessage({
                type: 'initialized',
                workerId,
                workerName
            });
            break;

        case 'process':
            processWithTracing(data, traceContext);
            break;
    }
};

function processWithTracing(data, traceContext) {
    const { operation, payload, delay, jitter } = data;
    const { traceId, parentSpanId } = traceContext;

    // Create new span for this operation
    const spanId = generateSpanId();
    const startTime = performance.now();

    // Report span start
    self.postMessage({
        type: 'spanStart',
        span: {
            traceId,
            spanId,
            parentSpanId,
            operationName: `${workerName}:${operation}`,
            workerId,
            startTime: Date.now(),
            tags: {
                'worker.id': workerId,
                'worker.name': workerName,
                'operation': operation
            },
            logs: [
                { timestamp: Date.now(), event: 'started', message: `Started ${operation}` }
            ]
        }
    });

    // Calculate actual delay with optional jitter
    let actualDelay = delay;
    if (jitter) {
        const jitterAmount = delay * 0.5 * (Math.random() * 2 - 1);
        actualDelay = Math.max(50, delay + jitterAmount);
    }

    // Simulate work
    simulateWork(actualDelay);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Process result
    const result = {
        workerId,
        operation,
        processed: true,
        inputPayload: payload,
        outputPayload: transformPayload(payload, operation),
        processingTime: duration
    };

    // Report span end
    self.postMessage({
        type: 'spanEnd',
        span: {
            traceId,
            spanId,
            parentSpanId,
            operationName: `${workerName}:${operation}`,
            workerId,
            endTime: Date.now(),
            duration,
            status: 'OK',
            tags: {
                'worker.id': workerId,
                'worker.name': workerName,
                'operation': operation,
                'duration.ms': duration.toFixed(2)
            },
            logs: [
                { timestamp: Date.now(), event: 'completed', message: `Completed ${operation} in ${duration.toFixed(2)}ms` }
            ]
        },
        result,
        nextTraceContext: {
            traceId,
            parentSpanId: spanId
        }
    });
}

function simulateWork(delay) {
    const start = performance.now();
    let result = 0;

    // Busy work to simulate CPU usage
    while (performance.now() - start < delay) {
        result += Math.sqrt(Math.random()) * Math.sin(result);
    }

    return result;
}

function transformPayload(payload, operation) {
    // Simulate payload transformation
    return {
        ...payload,
        processedBy: workerName,
        operation,
        timestamp: Date.now(),
        transformed: true
    };
}

function generateSpanId() {
    return 'span_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}
