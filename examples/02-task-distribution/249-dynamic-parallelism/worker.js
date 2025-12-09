// Dynamic Parallelism - Worker Thread

self.onmessage = function(e) {
    const { type, taskId, complexity } = e.data;

    if (type === 'process') {
        processTask(taskId, complexity);
    }
};

function processTask(taskId, complexity) {
    const startTime = performance.now();

    // Simulate variable workload based on complexity
    let result = 0;
    const iterations = complexity * 100;

    for (let i = 0; i < iterations; i++) {
        result += Math.sin(i * 0.01) * Math.cos(i * 0.02);
        result = Math.sqrt(Math.abs(result) + 1);

        // Add some variance to make it more realistic
        if (i % 1000 === 0) {
            result += Math.random() * 0.001;
        }
    }

    // Compute some additional metrics
    const computations = {
        sum: result,
        iterations: iterations,
        complexity: complexity
    };

    const executionTime = performance.now() - startTime;

    self.postMessage({
        type: 'result',
        taskId,
        result: computations,
        executionTime
    });
}
