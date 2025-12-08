// Mixed Parallelism - Worker Thread

let taskStartTime = 0;

self.onmessage = function(e) {
    const data = e.data;

    switch (data.type) {
        case 'data_parallel':
            handleDataParallel(data);
            break;
        case 'task_parallel':
            handleTaskParallel(data);
            break;
        case 'pipeline_stage':
            handlePipelineStage(data);
            break;
        case 'pipeline_done':
            self.postMessage({ type: 'done' });
            break;
        case 'mixed_phase1':
            handleMixedPhase1(data);
            break;
        case 'mixed_phase2':
            handleMixedPhase2(data);
            break;
        case 'mixed_phase3':
            handleMixedPhase3(data);
            break;
        case 'sequential_baseline':
            handleSequentialBaseline(data);
            break;
    }
};

// Data Parallelism Handler
function handleDataParallel(msg) {
    const { data, workerId, iterations } = msg;
    const startTime = performance.now();

    self.postMessage({
        type: 'activity',
        task: 'data_process',
        startTime: 0,
        workerId
    });

    const results = [];
    for (const item of data) {
        const processed = processItem(item, iterations);
        results.push(processed);
    }

    const endTime = performance.now() - startTime;

    self.postMessage({
        type: 'activity',
        task: 'data_process',
        startTime: 0,
        endTime,
        workerId
    });

    self.postMessage({
        type: 'result',
        pattern: 'data',
        processedData: results,
        itemsProcessed: data.length,
        executionTime: endTime,
        workerId
    });
}

// Task Parallelism Handler
function handleTaskParallel(msg) {
    const { task, taskName, data, workerId, iterations } = msg;
    const startTime = performance.now();

    self.postMessage({
        type: 'activity',
        task: taskName,
        startTime: 0,
        workerId
    });

    let result;
    switch (task) {
        case 'computeSum':
            result = computeSum(data, iterations);
            break;
        case 'computeStats':
            result = computeStats(data, iterations);
            break;
        case 'filterData':
            result = filterData(data, iterations);
            break;
        case 'transformData':
            result = transformData(data, iterations);
            break;
        case 'sortData':
            result = sortData(data, iterations);
            break;
        case 'aggregateData':
            result = aggregateData(data, iterations);
            break;
        case 'normalizeData':
            result = normalizeData(data, iterations);
            break;
        case 'analyzeData':
            result = analyzeData(data, iterations);
            break;
        default:
            result = { error: 'Unknown task' };
    }

    const endTime = performance.now() - startTime;

    self.postMessage({
        type: 'activity',
        task: taskName,
        startTime: 0,
        endTime,
        workerId
    });

    self.postMessage({
        type: 'result',
        pattern: 'task',
        taskResult: result,
        taskName,
        itemsProcessed: data.length,
        executionTime: endTime,
        workerId
    });
}

// Pipeline Stage Handler
function handlePipelineStage(msg) {
    const { stage, stageName, data, batchId, workerId, iterations, totalBatches } = msg;
    const startTime = performance.now();

    self.postMessage({
        type: 'activity',
        task: stageName,
        startTime: taskStartTime,
        workerId
    });

    const result = processPipelineStage(data, stage, iterations);

    const endTime = performance.now() - startTime;
    taskStartTime += endTime;

    self.postMessage({
        type: 'activity',
        task: stageName,
        startTime: taskStartTime - endTime,
        endTime: taskStartTime,
        workerId
    });

    self.postMessage({
        type: 'stage_result',
        stage,
        stageName,
        result,
        batchId,
        executionTime: endTime,
        workerId
    });
}

// Mixed Phase 1: Data Parallel Preprocessing
function handleMixedPhase1(msg) {
    const { data, workerId, iterations } = msg;
    const startTime = performance.now();

    self.postMessage({
        type: 'activity',
        task: 'preprocess',
        startTime: 0,
        workerId
    });

    const processedData = data.map(item => ({
        ...item,
        normalized: item.value / 1000,
        squared: item.value * item.value,
        log: Math.log(item.value + 1)
    }));

    // Simulate computation
    simulateWork(iterations);

    const endTime = performance.now() - startTime;

    self.postMessage({
        type: 'activity',
        task: 'preprocess',
        startTime: 0,
        endTime,
        workerId
    });

    self.postMessage({
        type: 'result',
        phase: 1,
        processedData,
        itemsProcessed: data.length,
        executionTime: endTime,
        workerId
    });
}

// Mixed Phase 2: Task Parallel Analysis
function handleMixedPhase2(msg) {
    const { task, data, workerId, iterations } = msg;
    const startTime = performance.now();

    self.postMessage({
        type: 'activity',
        task: task,
        startTime: 0,
        workerId
    });

    let analysisResult;
    switch (task) {
        case 'statistical':
            analysisResult = performStatisticalAnalysis(data, iterations);
            break;
        case 'categorical':
            analysisResult = performCategoricalAnalysis(data, iterations);
            break;
        case 'temporal':
            analysisResult = performTemporalAnalysis(data, iterations);
            break;
        case 'correlation':
            analysisResult = performCorrelationAnalysis(data, iterations);
            break;
    }

    const endTime = performance.now() - startTime;

    self.postMessage({
        type: 'activity',
        task: task,
        startTime: 0,
        endTime,
        workerId
    });

    self.postMessage({
        type: 'result',
        phase: 2,
        task,
        analysisResult,
        itemsProcessed: data.length,
        executionTime: endTime,
        workerId
    });
}

// Mixed Phase 3: Pipeline Finalization
function handleMixedPhase3(msg) {
    const { stage, data, workerId, iterations } = msg;
    const startTime = performance.now();

    self.postMessage({
        type: 'activity',
        task: `stage_${stage}`,
        startTime: 0,
        workerId
    });

    const stageOutput = processFinalStage(data, stage, iterations);

    const endTime = performance.now() - startTime;

    self.postMessage({
        type: 'activity',
        task: `stage_${stage}`,
        startTime: 0,
        endTime,
        workerId
    });

    self.postMessage({
        type: 'result',
        phase: 3,
        stage,
        stageOutput,
        executionTime: endTime,
        workerId
    });
}

// Sequential Baseline
function handleSequentialBaseline(msg) {
    const { data, iterations } = msg;
    const startTime = performance.now();

    // Process all data sequentially
    for (const item of data) {
        processItem(item, iterations);
    }

    const executionTime = performance.now() - startTime;

    self.postMessage({
        type: 'result',
        executionTime
    });
}

// Helper Functions

function processItem(item, iterations) {
    let result = item.value;
    for (let i = 0; i < iterations; i++) {
        result = Math.sin(result) * Math.cos(result) + Math.sqrt(Math.abs(result));
    }
    return { ...item, processed: result };
}

function simulateWork(iterations) {
    let x = 0;
    for (let i = 0; i < iterations * 100; i++) {
        x += Math.sin(i) * Math.cos(i);
    }
    return x;
}

function computeSum(data, iterations) {
    simulateWork(iterations);
    return data.reduce((sum, item) => sum + item.value, 0);
}

function computeStats(data, iterations) {
    simulateWork(iterations);
    const values = data.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    return { mean, variance, stdDev: Math.sqrt(variance), min: Math.min(...values), max: Math.max(...values) };
}

function filterData(data, iterations) {
    simulateWork(iterations);
    return data.filter(item => item.value > 500);
}

function transformData(data, iterations) {
    simulateWork(iterations);
    return data.map(item => ({
        ...item,
        transformed: Math.log(item.value + 1) * 100
    }));
}

function sortData(data, iterations) {
    simulateWork(iterations);
    return [...data].sort((a, b) => a.value - b.value);
}

function aggregateData(data, iterations) {
    simulateWork(iterations);
    const groups = {};
    for (const item of data) {
        if (!groups[item.category]) {
            groups[item.category] = { count: 0, sum: 0 };
        }
        groups[item.category].count++;
        groups[item.category].sum += item.value;
    }
    return groups;
}

function normalizeData(data, iterations) {
    simulateWork(iterations);
    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    const range = max - min || 1;
    return data.map(item => ({
        ...item,
        normalized: (item.value - min) / range
    }));
}

function analyzeData(data, iterations) {
    simulateWork(iterations);
    const categories = {};
    for (const item of data) {
        categories[item.category] = (categories[item.category] || 0) + 1;
    }
    return { categoryDistribution: categories, totalItems: data.length };
}

function processPipelineStage(data, stage, iterations) {
    simulateWork(iterations);

    if (Array.isArray(data)) {
        return data.map(item => ({
            ...item,
            [`stage${stage}`]: true,
            [`stage${stage}Value`]: typeof item.value === 'number' ? item.value * (stage + 1) : stage
        }));
    }
    return { ...data, [`stage${stage}`]: true };
}

function performStatisticalAnalysis(data, iterations) {
    simulateWork(iterations);
    const values = data.map(d => d.value || d.normalized || 0);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    const skewness = values.reduce((s, v) => s + Math.pow((v - mean) / Math.sqrt(variance), 3), 0) / n;
    return { mean, variance, stdDev: Math.sqrt(variance), skewness };
}

function performCategoricalAnalysis(data, iterations) {
    simulateWork(iterations);
    const categories = {};
    for (const item of data) {
        const cat = item.category || 0;
        if (!categories[cat]) {
            categories[cat] = { count: 0, values: [] };
        }
        categories[cat].count++;
        categories[cat].values.push(item.value || item.normalized || 0);
    }
    return categories;
}

function performTemporalAnalysis(data, iterations) {
    simulateWork(iterations);
    // Simulate temporal analysis by treating id as time series
    const sorted = [...data].sort((a, b) => (a.id || 0) - (b.id || 0));
    const trends = [];
    const windowSize = Math.max(10, Math.floor(sorted.length / 20));

    for (let i = 0; i < sorted.length - windowSize; i += windowSize) {
        const window = sorted.slice(i, i + windowSize);
        const avg = window.reduce((s, item) => s + (item.value || item.normalized || 0), 0) / windowSize;
        trends.push({ index: i, average: avg });
    }
    return { trends, windowSize };
}

function performCorrelationAnalysis(data, iterations) {
    simulateWork(iterations);
    // Analyze correlation between value and category
    const categoryMeans = {};
    for (const item of data) {
        const cat = item.category || 0;
        if (!categoryMeans[cat]) {
            categoryMeans[cat] = { sum: 0, count: 0 };
        }
        categoryMeans[cat].sum += item.value || item.normalized || 0;
        categoryMeans[cat].count++;
    }

    for (const cat in categoryMeans) {
        categoryMeans[cat].mean = categoryMeans[cat].sum / categoryMeans[cat].count;
    }

    return { categoryMeans };
}

function processFinalStage(data, stage, iterations) {
    simulateWork(iterations);

    // Combine and format results from previous phases
    const stageNames = ['merge', 'validate', 'format', 'output'];
    const stageName = stageNames[stage % stageNames.length];

    return {
        stageName,
        stageIndex: stage,
        inputSize: Array.isArray(data) ? data.length : 1,
        processed: true,
        timestamp: Date.now()
    };
}
